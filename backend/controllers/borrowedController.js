const Borrowed = require("../models/Borrowed");
const Member = require("../models/Member");

// Helper to resolve or auto-create a Member when a person name is entered
const resolveOrCreateMember = async (item) => {
  if (!item) return null;
  const memberName = typeof item === "object" ? (item.fullName || item.name || item.personName || "") : String(item).trim();
  const existingMemberId = typeof item === "object" ? item.memberId || item._id : null;

  if (!memberName || /myself/i.test(memberName)) {
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

// @desc    Get all borrowed entries with filters & aggregated statistics
// @route   GET /api/borrowed
const getBorrowedEntries = async (req, res) => {
  try {
    const { status, type, search, description, personName, startDate, endDate, minAmount, maxAmount } = req.query;

    const andConditions = [];

    // 1. Status filter (Pending / Paid)
    if (status && status !== "All") {
      andConditions.push({ status: { $regex: new RegExp(`^${status}$`, "i") } });
    }

    // 2. Type filter (Expense / Borrowed / Loan)
    if (type && type !== "All") {
      andConditions.push({ type: { $regex: new RegExp(`^${type}$`, "i") } });
    }

    // 3. Person Name filter
    if (personName) {
      const names = Array.isArray(personName) ? personName : [personName];
      const nameConditions = names.map((n) => {
        const escaped = n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        return { personName: { $regex: new RegExp(escaped, "i") } };
      });
      if (nameConditions.length > 0) {
        andConditions.push({ $or: nameConditions });
      }
    }

    // 4. Global Search (name or description)
    if (search && search.trim()) {
      const s = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({
        $or: [
          { personName: { $regex: s, $options: "i" } },
          { description: { $regex: s, $options: "i" } },
        ],
      });
    }

    // 5. Dedicated Description filter
    if (description && description.trim()) {
      const desc = description.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({ description: { $regex: desc, $options: "i" } });
    }

    // 6. Date Range
    if (startDate) {
      andConditions.push({ date: { $gte: startDate } });
    }
    if (endDate) {
      andConditions.push({ date: { $lte: endDate } });
    }

    // 7. Amount Range
    if (minAmount) {
      andConditions.push({ amount: { $gte: parseFloat(minAmount) } });
    }
    if (maxAmount) {
      andConditions.push({ amount: { $lte: parseFloat(maxAmount) } });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};
    const entries = await Borrowed.find(query).sort({ date: -1, time: -1 });

    // Calculate aggregated stats
    const totalPending = entries
      .filter((e) => (e.status || "Pending").toLowerCase() === "pending")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalPaid = entries
      .filter((e) => (e.status || "").toLowerCase() === "paid")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalAmount = entries.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    res.json({
      success: true,
      count: entries.length,
      stats: {
        totalPending: Math.trunc(totalPending),
        totalPaid: Math.trunc(totalPaid),
        totalAmount: Math.trunc(totalAmount),
      },
      data: entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new borrowed entry
// @route   POST /api/borrowed
const createBorrowedEntry = async (req, res) => {
  try {
    const { personName, memberId, type, status, amount, date, time, description } = req.body;

    if (!personName || !personName.trim()) {
      return res.status(400).json({ success: false, message: "Person / Lender name is required" });
    }

    if (amount === undefined || amount === null || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    // Auto-resolve or create member in Members collection
    const resolvedMemberId = memberId || (await resolveOrCreateMember(personName));

    const newEntry = await Borrowed.create({
      personName: personName.trim(),
      memberId: resolvedMemberId,
      type: type || "Expense",
      status: status || "Pending",
      amount: Math.trunc(Number(amount)),
      date: date || new Date().toISOString().split("T")[0],
      time: time || new Date().toTimeString().split(" ")[0].substring(0, 5),
      description: description ? description.trim() : "",
    });

    res.status(201).json({
      success: true,
      message: "Borrowed entry created successfully",
      data: newEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update borrowed entry
// @route   PUT /api/borrowed/:id
const updateBorrowedEntry = async (req, res) => {
  try {
    const entry = await Borrowed.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Borrowed entry not found" });
    }

    const { personName, memberId, type, status, amount, date, time, description } = req.body;

    if (personName && personName.trim()) {
      entry.personName = personName.trim();
      const resolved = memberId || (await resolveOrCreateMember(personName));
      if (resolved) entry.memberId = resolved;
    }

    if (type) entry.type = type;
    if (status) entry.status = status;
    if (amount !== undefined && Number(amount) > 0) entry.amount = Math.trunc(Number(amount));
    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : "";

    await entry.save();

    res.json({
      success: true,
      message: "Borrowed entry updated successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single borrowed entry
// @route   DELETE /api/borrowed/:id
const deleteBorrowedEntry = async (req, res) => {
  try {
    const entry = await Borrowed.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Borrowed entry not found" });
    }

    await Borrowed.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Borrowed entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update status for borrowed entries (Pending / Paid)
// @route   POST /api/borrowed/bulk-status
const bulkUpdateBorrowedStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }
    if (!status || !["Pending", "Paid"].includes(status)) {
      return res.status(400).json({ success: false, message: "Valid status (Pending / Paid) required" });
    }

    await Borrowed.updateMany({ _id: { $in: ids } }, { $set: { status } });

    res.json({
      success: true,
      message: `Updated status for ${ids.length} borrowed entries to ${status}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete borrowed entries
// @route   POST /api/borrowed/bulk-delete
const bulkDeleteBorrowed = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }

    const result = await Borrowed.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} borrowed entries deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBorrowedEntries,
  createBorrowedEntry,
  updateBorrowedEntry,
  deleteBorrowedEntry,
  bulkUpdateBorrowedStatus,
  bulkDeleteBorrowed,
};
