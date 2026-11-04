const Entry = require("../models/Entry");
const Member = require("../models/Member");
const crypto = require("crypto");

// Helper to resolve or auto-create a Member when a new participant name is used
const resolveOrCreateMember = async (item) => {
  if (!item) return null;
  const memberName = typeof item === "object" ? (item.fullName || item.name || "") : String(item).trim();
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

// @desc    Get entries with filtering and pagination
// @route   GET /api/entries
const getEntries = async (req, res) => {
  try {
    const { status, type, paymentStatus, search, description, names, selectedNames, startDate, endDate, minAmount, maxAmount } = req.query;
    let query = {};
    const andConditions = [];

    const targetType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (targetType && targetType !== 'All') {
      andConditions.push({
        $or: [{ type: targetType }, { status: targetType }]
      });
    }

    const filterStatus = paymentStatus || (["Received", "Pending"].includes(status) && !["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (filterStatus && filterStatus !== 'All') {
      andConditions.push({ paymentStatus: filterStatus });
    }

    // Filter by multiple participant names from Autocomplete
    const rawNames = names || selectedNames || req.query['names[]'];
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

    const entries = await Entry.find(query).sort({ date: -1, time: -1, createdAt: -1 });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new entry or split entries across members
// @route   POST /api/entries
const createEntry = async (req, res) => {
  try {
    const { names, status, type, paymentStatus, amount, date, time, includeMine, description } = req.body;
    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : "Expense");
    const entryPaymentStatus = paymentStatus || (["Received", "Pending"].includes(status) ? status : "Pending");

    if (!names || (Array.isArray(names) && names.length === 0)) {
      return res.status(400).json({ success: false, message: "Member name is required" });
    }

    const parsedAmount = Math.trunc(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount" });
    }

    const entryDate = date || new Date().toISOString().split("T")[0];
    const entryTime = time || new Date().toTimeString().split(" ")[0].substring(0, 5);

    // Normalize names to an array
    const nameList = Array.isArray(names) ? names : [names];

    // Single person entry (not split)
    if (nameList.length === 1 && !includeMine) {
      const singleName = typeof nameList[0] === "object" ? (nameList[0].name || nameList[0].fullName) : nameList[0];
      const resolvedMemberId = await resolveOrCreateMember(nameList[0]);

      const singleEntry = new Entry({
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
        message: "Entry created successfully",
        data: [singleEntry],
      });
    }

    // MULTI-MEMBER SPLIT LOGIC:
    // Check if myself/you is already included in nameList
    const alreadyHasMine = nameList.some((item) => {
      const name = (typeof item === 'object' ? (item.name || item.fullName) : item).toLowerCase();
      return name.includes('myself') || name.includes('you (myself)');
    });

    // ONLY add a separate "You (Myself)" entry if includeMine was explicitly true AND myself is not already in the list
    const addSeparateMine = Boolean(includeMine) && !alreadyHasMine;
    const totalParticipants = nameList.length + (addSeparateMine ? 1 : 0);
    const splitAmount = Math.trunc(parsedAmount / totalParticipants);
    const splitGroupId = `split_${crypto.randomBytes(6).toString("hex")}`;

    const createdEntries = [];

    // Create entry for each member in the list
    for (const item of nameList) {
      const memberName = typeof item === "object" ? (item.name || item.fullName) : item;
      const isThisMine = memberName.toLowerCase().includes('myself') || memberName.toLowerCase().includes('you (myself)');
      const resolvedMemberId = isThisMine ? null : await resolveOrCreateMember(item);

      const memberEntry = new Entry({
        forFromName: memberName,
        memberId: resolvedMemberId,
        type: isThisMine ? "Expense" : "Split", // Mine is Expense, others Split
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

    // Add mine if not already selected
    if (addSeparateMine) {
      const myEntry = new Entry({
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
      message: `Split successfully across ${createdEntries.length} entries (₹${splitAmount} each)`,
      data: createdEntries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all entries in a split group
// @route   GET /api/entries/split-group/:splitGroupId
const getSplitGroupEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ splitGroupId: req.params.splitGroupId });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update single entry or split group entries
// @route   PUT /api/entries/:id
const updateEntry = async (req, res) => {
  try {
    const { forFromName, status, type, paymentStatus, amount, totalAmount, date, time, description } = req.body;
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : undefined);
    const entryPaymentStatus = paymentStatus || (["Received", "Pending"].includes(status) ? status : undefined);

    // IF THIS IS A SPLIT ENTRY:
    // Update all entries in this split group together so they remain identical
    if (entry.isSplit && entry.splitGroupId) {
      const groupEntries = await Entry.find({ splitGroupId: entry.splitGroupId });
      const groupCount = groupEntries.length || 1;

      let perPersonAmount = entry.amount;
      let calculatedTotal = entry.originalTotalAmount || (entry.amount * groupCount);

      if (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) > 0) {
        calculatedTotal = Math.trunc(Number(totalAmount));
        perPersonAmount = Math.trunc(calculatedTotal / groupCount);
      } else if (amount !== undefined && Number(amount) > 0) {
        perPersonAmount = Math.trunc(Number(amount));
        calculatedTotal = perPersonAmount * groupCount;
      }

      const updateData = {
        amount: perPersonAmount,
        originalTotalAmount: calculatedTotal,
      };

      if (date) updateData.date = date;
      if (time) updateData.time = time;
      if (description !== undefined) updateData.description = description ? description.trim() : '';

      // Update group fields across all split members
      await Entry.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });

      // Only update paymentStatus for this specific entry (not all split members)
      if (entryPaymentStatus) {
        entry.paymentStatus = entryPaymentStatus;
        await entry.save();
      }

      const updatedEntries = await Entry.find({ splitGroupId: entry.splitGroupId });

      return res.json({
        success: true,
        message: `Updated all ${groupCount} split member entries (₹${perPersonAmount} each)`,
        isSplitGroupUpdate: true,
        data: updatedEntries,
      });
    }

    // NON-SPLIT (SINGLE) ENTRY:
    if (forFromName) {
      entry.forFromName = forFromName;
      const isMine = /myself/i.test(forFromName) || /you\s*\(myself\)/i.test(forFromName);
      if (!isMine) {
        const resolvedId = await resolveOrCreateMember(forFromName);
        if (resolvedId) entry.memberId = resolvedId;
      } else {
        entry.memberId = null;
      }
    }
    if (entryType) {
      entry.type = entryType;
      entry.status = entryType;
    }
    if (entryPaymentStatus) {
      entry.paymentStatus = entryPaymentStatus;
    }
    if (amount !== undefined) entry.amount = Math.trunc(Number(amount));
    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : '';

    await entry.save();
    res.json({ success: true, data: entry, message: "Entry updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single entry
// @route   DELETE /api/entries/:id
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    await Entry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update status or type for entries
// @route   POST /api/entries/bulk-status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, type, paymentStatus, isTypeUpdate } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }

    let updateData = {};
    if (isTypeUpdate && (type || status)) {
      const targetType = type || status;
      updateData = { type: targetType, status: targetType };
    } else if (paymentStatus || (["Received", "Pending"].includes(status) && !isTypeUpdate)) {
      const targetStatus = paymentStatus || status;
      updateData = { paymentStatus: targetStatus };
    } else if (type || ["Add Balance", "Expense", "Loan", "Split"].includes(status)) {
      const targetType = type || status;
      updateData = { type: targetType, status: targetType };
    } else {
      return res.status(400).json({ success: false, message: "Valid status or type is required" });
    }

    const result = await Entry.updateMany({ _id: { $in: ids } }, { $set: updateData });
    res.json({
      success: true,
      message: `${result.modifiedCount} entries updated successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete entries
// @route   POST /api/entries/bulk-delete
const bulkDeleteEntries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }

    const result = await Entry.deleteMany({ _id: { $in: ids } });
    res.json({
      success: true,
      message: `${result.deletedCount} entries deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEntries,
  getSplitGroupEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkUpdateStatus,
  bulkDeleteEntries,
};
