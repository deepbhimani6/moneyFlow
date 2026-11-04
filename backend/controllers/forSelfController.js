const ForSelf = require("../models/ForSelf");
const Entry = require("../models/Entry");

// @desc    Get all For Self entries with filtering, search, and summary stats
// @route   GET /api/for-self
const getForSelfEntries = async (req, res) => {
  try {
    const {
      type,
      status,
      paymentStatus,
      forFromName,
      name,
      search,
      description,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    const andConditions = [];

    // 1. Type / Status filter (Add Balance / Expense / Split)
    const effectiveType = type || status;
    if (effectiveType && effectiveType !== "All") {
      andConditions.push({
        $or: [
          { type: { $regex: new RegExp(`^${effectiveType}$`, "i") } },
          { status: { $regex: new RegExp(`^${effectiveType}$`, "i") } },
        ],
      });
    }

    // 2. Payment Status (Paid / Pending)
    if (paymentStatus && paymentStatus !== "All") {
      andConditions.push({
        paymentStatus: { $regex: new RegExp(`^${paymentStatus}$`, "i") },
      });
    }

    // 3. Member / ForFrom Name
    const targetName = forFromName || name;
    if (targetName && targetName.trim()) {
      const cleanName = targetName.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({
        forFromName: { $regex: cleanName, $options: "i" },
      });
    }

    // 4. Global search
    if (search && search.trim()) {
      const s = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({
        $or: [
          { forFromName: { $regex: s, $options: "i" } },
          { description: { $regex: s, $options: "i" } },
          { type: { $regex: s, $options: "i" } },
          { paymentStatus: { $regex: s, $options: "i" } },
        ],
      });
    }

    // 5. Dedicated description filter
    if (description && description.trim()) {
      const desc = description.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      andConditions.push({ description: { $regex: desc, $options: "i" } });
    }

    // 6. Date range
    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) dateCond.$gte = startDate;
      if (endDate) dateCond.$lte = endDate;
      andConditions.push({ date: dateCond });
    }

    // 7. Amount range
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

// @desc    Create new For Self entry
// @route   POST /api/for-self
const createForSelfEntry = async (req, res) => {
  try {
    const { forFromName, type, status, paymentStatus, amount, date, time, description } = req.body;

    const entryType = type || status || "Expense";
    const parsedAmount = Math.trunc(Number(amount));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount" });
    }

    const entryDate = date || new Date().toISOString().split("T")[0];
    const entryTime = time || new Date().toTimeString().split(" ")[0].substring(0, 5);

    const newEntry = await ForSelf.create({
      forFromName: (forFromName && forFromName.trim()) || "Myself (You)",
      type: entryType,
      status: entryType,
      paymentStatus: paymentStatus || "Paid",
      amount: parsedAmount,
      date: entryDate,
      time: entryTime,
      description: description ? description.trim() : "",
      isSplit: false,
      isMine: true,
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

// @desc    Update a For Self entry (supports split sync if splitGroupId present)
// @route   PUT /api/for-self/:id
const updateForSelfEntry = async (req, res) => {
  try {
    const { forFromName, type, status, paymentStatus, amount, totalAmount, date, time, description } = req.body;

    const entry = await ForSelf.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    if (entry.isSplit && entry.splitGroupId) {
      // Split group sync
      const updateData = {};
      if (date) updateData.date = date;
      if (time) updateData.time = time;
      if (description !== undefined) updateData.description = description ? description.trim() : "";

      if (amount !== undefined) {
        updateData.amount = Math.trunc(Number(amount));
      }
      if (totalAmount !== undefined) {
        updateData.originalTotalAmount = Math.trunc(Number(totalAmount));
      }

      await ForSelf.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });
      await Entry.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });

      if (paymentStatus) {
        entry.paymentStatus = paymentStatus;
        await entry.save();
      }

      const updated = await ForSelf.findById(req.params.id);
      return res.json({
        success: true,
        message: "Split entry synchronized successfully",
        data: updated,
      });
    }

    // Normal non-split entry update
    if (forFromName !== undefined) entry.forFromName = forFromName.trim() || "Myself (You)";
    if (type || status) {
      entry.type = type || status;
      entry.status = type || status;
    }
    if (paymentStatus) entry.paymentStatus = paymentStatus;
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

// @desc    Bulk update payment status for For Self entries
// @route   POST /api/for-self/bulk-status
const bulkUpdateStatusForSelf = async (req, res) => {
  try {
    const { ids, paymentStatus } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entry IDs provided" });
    }
    if (!paymentStatus) {
      return res.status(400).json({ success: false, message: "Payment status is required" });
    }

    const result = await ForSelf.updateMany(
      { _id: { $in: ids } },
      { $set: { paymentStatus } }
    );

    res.json({
      success: true,
      message: `Updated status for ${result.modifiedCount} entries to ${paymentStatus}`,
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
  bulkUpdateStatusForSelf,
};
