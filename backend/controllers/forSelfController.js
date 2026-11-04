const ForSelf = require("../models/ForSelf");

// @desc    Get all For Self entries with filtering, search, and summary stats
// @route   GET /api/for-self
const getForSelfEntries = async (req, res) => {
  try {
    const { type, search, description, startDate, endDate, minAmount, maxAmount } = req.query;
    const andConditions = [];

    // 1. Type filter (Add Balance / Expense)
    if (type && type !== "All") {
      andConditions.push({ type: { $regex: new RegExp(`^${type}$`, "i") } });
    }

    // 2. Global search
    if (search && search.trim()) {
      const s = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({
        $or: [
          { description: { $regex: s, $options: "i" } },
          { type: { $regex: s, $options: "i" } },
        ],
      });
    }

    // 3. Dedicated description filter
    if (description && description.trim()) {
      const desc = description.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({ description: { $regex: desc, $options: "i" } });
    }

    // 4. Date range
    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) dateCond.$gte = startDate;
      if (endDate) dateCond.$lte = endDate;
      andConditions.push({ date: dateCond });
    }

    // 5. Amount range
    if (minAmount || maxAmount) {
      const amountCond = {};
      if (minAmount) amountCond.$gte = Number(minAmount);
      if (maxAmount) amountCond.$lte = Number(maxAmount);
      andConditions.push({ amount: amountCond });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};
    const entries = await ForSelf.find(query).sort({ date: -1, time: -1, createdAt: -1 });

    // Calculate aggregated stats
    const totalBalanceAdded = entries
      .filter((e) => (e.type || "").toLowerCase() === "add balance")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const totalPersonalExpenses = entries
      .filter((e) => (e.type || "").toLowerCase() === "expense")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const netBalance = totalBalanceAdded - totalPersonalExpenses;

    res.json({
      success: true,
      count: entries.length,
      stats: {
        totalBalanceAdded: Math.trunc(totalBalanceAdded),
        totalPersonalExpenses: Math.trunc(totalPersonalExpenses),
        netBalance: Math.trunc(netBalance),
      },
      data: entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new For Self entry (Add Balance or Expense)
// @route   POST /api/for-self
const createForSelfEntry = async (req, res) => {
  try {
    const { type, amount, date, time, description } = req.body;

    const entryType = type === "Add Balance" ? "Add Balance" : "Expense";
    const parsedAmount = Math.trunc(Number(amount));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount" });
    }

    const entryDate = date || new Date().toISOString().split("T")[0];
    const entryTime = time || new Date().toTimeString().split(" ")[0].substring(0, 5);

    const newEntry = await ForSelf.create({
      type: entryType,
      amount: parsedAmount,
      date: entryDate,
      time: entryTime,
      description: description ? description.trim() : "",
      isSplit: false,
    });

    res.status(201).json({
      success: true,
      message: `${entryType} entry created successfully`,
      data: newEntry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a For Self entry
// @route   PUT /api/for-self/:id
const updateForSelfEntry = async (req, res) => {
  try {
    const { type, amount, date, time, description } = req.body;

    const entry = await ForSelf.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    if (type) entry.type = type === "Add Balance" ? "Add Balance" : "Expense";
    if (amount !== undefined) entry.amount = Math.trunc(Number(amount));
    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : "";

    await entry.save();

    res.json({
      success: true,
      message: "Entry updated successfully",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single For Self entry
// @route   DELETE /api/for-self/:id
const deleteForSelfEntry = async (req, res) => {
  try {
    const entry = await ForSelf.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    await ForSelf.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Entry deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete For Self entries
// @route   POST /api/for-self/bulk-delete
const bulkDeleteForSelf = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }

    const result = await ForSelf.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} entries deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getForSelfEntries,
  createForSelfEntry,
  updateForSelfEntry,
  deleteForSelfEntry,
  bulkDeleteForSelf,
};
