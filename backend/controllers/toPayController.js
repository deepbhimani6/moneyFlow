const ToPay = require("../models/ToPay");
const Member = require("../models/Member");
const crypto = require("crypto");
const { capitalizeName } = require("../utils/formatters");

// Helper to resolve or auto-create a Member when a new participant name is used
const resolveOrCreateMember = async (item) => {
  if (!item) return null;
  const rawName = typeof item === "object" ? (item.fullName || item.name || "") : String(item).trim();
  const memberName = capitalizeName(rawName);
  const existingMemberId = typeof item === "object" ? item.memberId || item._id : null;

  if (!memberName || /myself/i.test(memberName) || /you\s*\(myself\)/i.test(memberName)) {
    return null;
  }

  // If already an existing MongoDB ObjectId, check if it exists
  if (existingMemberId && existingMemberId !== "myself") {
    const existing = await Member.findById(existingMemberId).catch(() => null);
    if (existing) return existing._id;
  }

  // Look for existing member by exact name (case-insensitive)
  const escaped = memberName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  let member = await Member.findOne({
    fullName: { $regex: new RegExp(`^${escaped}$`, "i") },
  });

  if (!member) {
    member = await Member.create({
      fullName: memberName,
      email: "",
      phoneNumber: "",
      username: memberName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      password: "",
      joinDate: new Date(),
      inviteSent: false,
    });
  }

  return member._id;
};

// @desc    Get to-pay entries with filtering, search and sorting
// @route   GET /api/to-pay
const getToPayEntries = async (req, res) => {
  try {
    const { status, type, paymentStatus, search, description, names, selectedNames, forFromName, name, personName, startDate, endDate, minAmount, maxAmount } = req.query;
    let query = {};
    const andConditions = [];

    const targetType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (targetType && targetType !== 'All') {
      andConditions.push({
        $or: [{ type: targetType }, { status: targetType }]
      });
    }

    const filterStatus = paymentStatus || (["Paid", "Pending"].includes(status) && !["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (filterStatus && filterStatus !== 'All') {
      andConditions.push({
        $or: [{ paymentStatus: filterStatus }, { status: filterStatus }]
      });
    }

    // Filter by member / person name
    const rawNames = forFromName || name || personName || names || selectedNames || req.query['names[]'];
    let participantList = [];
    if (Array.isArray(rawNames)) {
      participantList = rawNames.filter(Boolean);
    } else if (typeof rawNames === 'string' && rawNames.trim()) {
      participantList = rawNames.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (participantList.length > 0) {
      const nameOrConditions = participantList.map((name) => {
        if (/myself/i.test(name)) {
          return {
            $or: [
              { forFromName: { $regex: /myself/i } },
              { isMine: true },
            ],
          };
        }
        return {
          $or: [
            { forFromName: { $regex: name, $options: 'i' } },
            { description: { $regex: name, $options: 'i' } },
          ],
        };
      });
      andConditions.push({ $or: nameOrConditions });
    }

    // Filter by description
    if (description && description.trim()) {
      andConditions.push({
        description: { $regex: description.trim(), $options: 'i' },
      });
    }

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { forFromName: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    const entries = await ToPay.find(query).sort({ date: -1, time: -1, createdAt: -1 });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new To Pay entry or split entries across members
// @route   POST /api/to-pay
const createToPayEntry = async (req, res) => {
  try {
    const { names, status, type, paymentStatus, amount, date, time, includeMine, description } = req.body;
    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : "Expense");
    const entryPaymentStatus = paymentStatus || (["Paid", "Pending"].includes(status) ? status : "Pending");

    if (!names || (Array.isArray(names) && names.length === 0)) {
      return res.status(400).json({ success: false, message: "Member name is required." });
    }

    const parsedAmount = Math.trunc(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount." });
    }

    const entryDate = date || new Date().toISOString().split("T")[0];
    const entryTime = time || new Date().toTimeString().split(" ")[0].substring(0, 5);

    // Normalize names to an array
    const nameList = Array.isArray(names) ? names : [names];

    // Single person entry (not split)
    if (nameList.length === 1 && !includeMine) {
      const singleName = typeof nameList[0] === "object" ? (nameList[0].name || nameList[0].fullName) : nameList[0];
      const resolvedMemberId = await resolveOrCreateMember(nameList[0]);

      const singleEntry = new ToPay({
        forFromName: singleName,
        memberId: resolvedMemberId,
        type: entryType,
        status: entryType,
        paymentStatus: entryPaymentStatus,
        amount: parsedAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: false,
      });

      await singleEntry.save();
      return res.status(201).json({
        success: true,
        message: "Entry created successfully.",
        data: [singleEntry],
      });
    }

    // MULTI-MEMBER SPLIT LOGIC:
    const alreadyHasMine = nameList.some((item) => {
      const name = (typeof item === 'object' ? (item.name || item.fullName) : item).toLowerCase();
      return name.includes('myself') || name.includes('you (myself)');
    });

    const addSeparateMine = Boolean(includeMine) && !alreadyHasMine;
    const totalParticipants = nameList.length + (addSeparateMine ? 1 : 0);
    const splitAmount = Math.trunc(parsedAmount / totalParticipants);
    const splitGroupId = `split_${crypto.randomBytes(6).toString("hex")}`;

    const createdEntries = [];

    for (const item of nameList) {
      const memberName = typeof item === "object" ? (item.name || item.fullName) : item;
      const isThisMine = memberName.toLowerCase().includes('myself') || memberName.toLowerCase().includes('you (myself)');
      const resolvedMemberId = isThisMine ? null : await resolveOrCreateMember(item);

      const memberEntry = new ToPay({
        forFromName: memberName,
        memberId: resolvedMemberId,
        type: isThisMine ? "Expense" : "Split",
        status: isThisMine ? "Expense" : "Split",
        paymentStatus: entryPaymentStatus,
        amount: splitAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: true,
        splitGroupId,
        originalTotalAmount: parsedAmount,
        isMine: isThisMine,
      });

      await memberEntry.save();
      createdEntries.push(memberEntry);
    }

    if (addSeparateMine) {
      const myEntry = new ToPay({
        forFromName: "You (Myself)",
        memberId: null,
        type: "Expense",
        status: "Expense",
        paymentStatus: entryPaymentStatus,
        amount: splitAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: true,
        splitGroupId,
        originalTotalAmount: parsedAmount,
        isMine: true,
      });

      await myEntry.save();
      createdEntries.push(myEntry);
    }

    res.status(201).json({
      success: true,
      message: `Split across ${createdEntries.length} entries (₹${splitAmount} each).`,
      data: createdEntries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all to-pay entries in a split group
// @route   GET /api/to-pay/split-group/:splitGroupId
const getSplitGroupEntries = async (req, res) => {
  try {
    const entries = await ToPay.find({ splitGroupId: req.params.splitGroupId });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a to-pay entry (and optionally synchronise its split group)
// @route   PUT /api/to-pay/:id
const updateToPayEntry = async (req, res) => {
  try {
    const { forFromName, type, status, paymentStatus, amount, date, time, description, updateAllSplit, totalAmount } = req.body;

    const entry = await ToPay.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found." });
    }

    const nextType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : entry.type);
    const nextPaymentStatus = paymentStatus || (["Paid", "Pending"].includes(status) ? status : entry.paymentStatus);

    // If part of split group and user requested syncing all split items
    if (entry.isSplit && entry.splitGroupId && updateAllSplit) {
      const groupEntries = await ToPay.find({ splitGroupId: entry.splitGroupId });
      const count = groupEntries.length || 1;
      const newTotal = totalAmount ? Math.trunc(Number(totalAmount)) : (amount ? Math.trunc(Number(amount)) * count : entry.originalTotalAmount);
      const splitAmount = Math.trunc(newTotal / count);

      await ToPay.updateMany(
        { splitGroupId: entry.splitGroupId },
        {
          $set: {
            amount: splitAmount,
            originalTotalAmount: newTotal,
            date: date || entry.date,
            time: time || entry.time,
            description: description !== undefined ? description : entry.description,
            ...(nextPaymentStatus ? { paymentStatus: nextPaymentStatus } : {}),
          },
        }
      );

      const updated = await ToPay.findById(req.params.id);
      return res.json({
        success: true,
        message: `Updated ${count} split entries.`,
        data: updated,
      });
    }

    // Standard single entry update
    if (forFromName !== undefined) {
      entry.forFromName = forFromName;
      const isMine = /myself/i.test(forFromName) || /you\s*\(myself\)/i.test(forFromName);
      entry.isMine = isMine;
      entry.memberId = isMine ? null : await resolveOrCreateMember(forFromName);
    }

    if (nextType) {
      entry.type = nextType;
      entry.status = nextType;
    }

    if (nextPaymentStatus) {
      entry.paymentStatus = nextPaymentStatus;
    }

    if (amount !== undefined) {
      entry.amount = Math.trunc(Number(amount));
    }

    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : '';

    await entry.save();

    res.json({
      success: true,
      message: "Entry updated successfully.",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single to-pay entry
// @route   DELETE /api/to-pay/:id
const deleteToPayEntry = async (req, res) => {
  try {
    const entry = await ToPay.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found." });
    }

    await ToPay.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Entry deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update status for to-pay entries
// @route   POST /api/to-pay/bulk-status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    await ToPay.updateMany(
      { _id: { $in: ids } },
      { $set: { paymentStatus: status, status: status } }
    );

    res.json({
      success: true,
      message: `Updated status for ${ids.length} entries to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete to-pay entries
// @route   POST /api/to-pay/bulk-delete
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    const result = await ToPay.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} entries deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getToPayEntries,
  createToPayEntry,
  getSplitGroupEntries,
  updateToPayEntry,
  deleteToPayEntry,
  bulkUpdateStatus,
  bulkDelete,
};
