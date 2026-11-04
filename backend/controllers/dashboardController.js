const Entry = require("../models/Entry");
const ForSelf = require("../models/ForSelf");

// @desc    Get aggregated stats for dashboard
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // 1. Added Balance: from ForSelf with Type: "Add Balance"
    const addedRes = await ForSelf.aggregate([
      {
        $match: {
          type: "Add Balance",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAddBalance = addedRes[0]?.total || 0;

    // 2. Total Personal Expenses: from ForSelf with Type: "Expense"
    const expenseRes = await ForSelf.aggregate([
      {
        $match: {
          type: "Expense",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseRes[0]?.total || 0;

    // 3. Total Loans: from Entry (To Receive) Type: Loan (Status: Pending)
    const loanRes = await Entry.aggregate([
      {
        $match: {
          type: "Loan",
          $and: [
            {
              $or: [
                { paymentStatus: "Pending" },
                { paymentStatus: { $exists: false } },
                { paymentStatus: null },
              ],
            },
            {
              paymentStatus: { $ne: "Received" },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalLoans = loanRes[0]?.total || 0;

    // 4. Total Pending: from Entry (To Receive) Type: Split or Expense (Status: Pending)
    const pendingRes = await Entry.aggregate([
      {
        $match: {
          type: { $in: ["Expense", "Split"] },
          $or: [
            { paymentStatus: "Pending" },
            { paymentStatus: { $exists: false } },
            { paymentStatus: null },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPending = pendingRes[0]?.total || 0;

    // 5. Split Group stats: count items and distinct groups
    const splitDocs = await Entry.find({ isSplit: true }).lean();
    const totalSplit = splitDocs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const splitItemCount = splitDocs.length;
    const splitGroupIds = new Set(splitDocs.map((e) => e.splitGroupId).filter(Boolean));
    const splitGroupCount = splitGroupIds.size;
    const splitPendingCount = splitDocs.filter((e) => e.paymentStatus !== "Received").length;
    const splitReceivedCount = splitDocs.filter((e) => e.paymentStatus === "Received").length;

    // Formula: Total Balance = ((Total Balance - Total Expenses - Total Loans - Total Pending))
    const totalBalance = totalAddBalance - totalExpenses - totalLoans - totalPending;

    res.json({
      success: true,
      data: {
        totalBalance: Math.trunc(totalBalance),
        totalExpenses: Math.trunc(totalExpenses),
        totalLoans: Math.trunc(totalLoans),
        totalPending: Math.trunc(totalPending),
        totalSplit: Math.trunc(totalSplit),
        totalAddBalance: Math.trunc(totalAddBalance),
        splitItemCount,
        splitGroupCount,
        splitPendingCount,
        splitReceivedCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
