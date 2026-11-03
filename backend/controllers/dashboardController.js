const Entry = require("../models/Entry");

// @desc    Get aggregated stats for dashboard
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // 1. Group by Type for Add Balance, Expense, Loan, Split
    const typeStats = await Entry.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $in: ["$type", ["Add Balance", "Expense", "Loan", "Split"]] },
              "$type",
              "Expense",
            ],
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // 2. Aggregate Received from Status (only entries with status "Received")
    const receivedEntries = await Entry.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: "Received" },
            { status: "Received" },
          ],
        },
      },
      {
        $group: {
          _id: "Received",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // 3. Aggregate Pending from Status (entries with status "Pending" or not "Received")
    const pendingEntries = await Entry.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: "Pending" },
            {
              $and: [
                { paymentStatus: { $ne: "Received" } },
                { status: { $ne: "Received" } },
              ],
            },
          ],
        },
      },
      {
        $group: {
          _id: "Pending",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalExpenses = 0;
    let totalLoans = 0;
    let totalReceived = receivedEntries.length > 0 ? receivedEntries[0].totalAmount : 0;
    let totalPending = pendingEntries.length > 0 ? pendingEntries[0].totalAmount : 0;
    let totalSplit = 0;
    let totalAddBalance = 0;

    typeStats.forEach((item) => {
      if (item._id === "Add Balance") totalAddBalance = item.totalAmount;
      if (item._id === "Expense") totalExpenses = item.totalAmount;
      if (item._id === "Loan") totalLoans = item.totalAmount;
      if (item._id === "Split") totalSplit = item.totalAmount;
    });

    // Net balance: Added + Received - Expenses - Loans
    const totalBalance = totalAddBalance + totalReceived - totalExpenses - totalLoans;

    res.json({
      success: true,
      data: {
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        totalExpenses: parseFloat(totalExpenses.toFixed(2)),
        totalLoans: parseFloat(totalLoans.toFixed(2)),
        totalReceived: parseFloat(totalReceived.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        totalSplit: parseFloat(totalSplit.toFixed(2)),
        totalAddBalance: parseFloat(totalAddBalance.toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
