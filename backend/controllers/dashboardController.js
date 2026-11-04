const Entry = require("../models/Entry");

// @desc    Get aggregated stats for dashboard
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    // 1. Added Balance: entries with Type: "Add Balance"
    const addedRes = await Entry.aggregate([
      { $match: { type: "Add Balance" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAddBalance = addedRes[0]?.total || 0;

    // 2. Total Expenses: Type: Expense (For/From Name: Myself (You))
    const expenseRes = await Entry.aggregate([
      {
        $match: {
          type: "Expense",
          $or: [
            { forFromName: { $regex: /myself/i } },
            { isMine: true },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseRes[0]?.total || 0;

    // 3. Total Loans: Type: Loan (Status: Pending)
    const loanRes = await Entry.aggregate([
      {
        $match: {
          $or: [
            { type: { $regex: /^loans?$/i } },
            { status: { $regex: /^loans?$/i } },
          ],
          $and: [
            {
              $or: [
                { paymentStatus: { $regex: /^pending$/i } },
                { paymentStatus: { $exists: false } },
                { paymentStatus: null },
              ],
            },
            {
              paymentStatus: { $not: /received/i },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalLoans = loanRes[0]?.total || 0;

    // 4. Total Pending: Type: Split (Status: Pending) + Type: Expenses (not For/From Name: Myself (You) (Status: Pending))
    const pendingRes = await Entry.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { paymentStatus: "Pending" },
                { paymentStatus: { $exists: false } },
                { paymentStatus: null },
                { paymentStatus: { $ne: "Received" } },
              ],
            },
            {
              $or: [
                { type: "Split" },
                {
                  type: { $in: ["Expense", "Expenses"] },
                  forFromName: { $not: /myself/i },
                  isMine: { $ne: true },
                },
              ],
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalPending = pendingRes[0]?.total || 0;

    // 5. Total Received: Status: Received (Without Type: Expenses, Add Balance) + Type: Expenses (not For/From Name: Myself (You) (Status: Received))
    const receivedRes = await Entry.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { paymentStatus: "Received" },
                { status: "Received" },
              ],
            },
            {
              $or: [
                {
                  type: { $nin: ["Expense", "Expenses", "expense", "expenses", "Add Balance", "add balance", "Add balance"] },
                },
                {
                  type: { $in: ["Expense", "Expenses"] },
                  forFromName: { $not: /myself/i },
                  isMine: { $ne: true },
                },
              ],
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalReceived = receivedRes[0]?.total || 0;

    // 6. Split Group stats: count items and distinct groups
    const splitDocs = await Entry.find({ isSplit: true }).lean();
    const totalSplit = splitDocs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const splitItemCount = splitDocs.length;
    const splitGroupIds = new Set(splitDocs.map((e) => e.splitGroupId).filter(Boolean));
    const splitGroupCount = splitGroupIds.size;
    const splitPendingCount = splitDocs.filter((e) => e.paymentStatus !== "Received").length;
    const splitReceivedCount = splitDocs.filter((e) => e.paymentStatus === "Received").length;

    // Formula 1: Total Balance = Added + Received - Expenses - Loans (Status: pending)
    const totalBalance = totalAddBalance + totalReceived - totalExpenses - totalLoans;

    res.json({
      success: true,
      data: {
        totalBalance: Math.trunc(totalBalance),
        totalExpenses: Math.trunc(totalExpenses),
        totalLoans: Math.trunc(totalLoans),
        totalReceived: Math.trunc(totalReceived),
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
