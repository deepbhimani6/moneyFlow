const Entry = require("../models/Entry");

// @desc    Get aggregated stats for dashboard
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const stats = await Entry.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $in: ["$type", ["Add Balance", "Expense", "Loan", "Received", "Split"]] },
              "$type",
              {
                $cond: [
                  { $in: ["$status", ["Add Balance", "Expense", "Loan", "Received", "Split"]] },
                  "$status",
                  "Expense"
                ]
              }
            ]
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalExpenses = 0;
    let totalLoans = 0;
    let totalReceived = 0;
    let totalSplit = 0;
    let totalAddBalance = 0;

    stats.forEach((item) => {
      if (item._id === "Add Balance") totalAddBalance = item.totalAmount;
      if (item._id === "Expense") totalExpenses = item.totalAmount;
      if (item._id === "Loan") totalLoans = item.totalAmount;
      if (item._id === "Received") totalReceived = item.totalAmount;
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
        totalSplit: parseFloat(totalSplit.toFixed(2)),
        totalAddBalance: parseFloat(totalAddBalance.toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
