const mongoose = require("mongoose");
const Entry = require("../models/Entry");
const ForSelf = require("../models/ForSelf");
const ToPay = require("../models/ToPay");

// @desc    Get aggregated stats for dashboard scoped to the authenticated user
// @route   GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user._id);

    // 1. Added Balance: from ForSelf with Type: "Add Balance"
    const addedRes = await ForSelf.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: "Add Balance",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalAddBalance = addedRes[0]?.total || 0;

    // 2. Total Personal Expenses: from ForSelf with Type: "Expense", "Split" or isSplit: true
    const expenseRes = await ForSelf.aggregate([
      {
        $match: {
          userId: userObjectId,
          $or: [
            { type: { $in: ["Expense", "Split"] } },
            { isSplit: true },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseRes[0]?.total || 0;

    // 3. Pending Receive Loans: from Entry (To Receive) Type: Loan (Status: Pending)
    const pendingReceiveLoansRes = await Entry.aggregate([
      {
        $match: {
          userId: userObjectId,
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
            {
              status: { $ne: "Received" },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingReceiveLoans = pendingReceiveLoansRes[0]?.total || 0;

    // 4. Pending Receive Expenses: from Entry (To Receive) Type: Split, Expenses (Status: Pending)
    const pendingReceiveExpensesRes = await Entry.aggregate([
      {
        $match: {
          userId: userObjectId,
          $or: [
            { type: { $in: ["Expense", "Split"] } },
            { isSplit: true },
          ],
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
            {
              status: { $ne: "Received" },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingReceiveExpenses = pendingReceiveExpensesRes[0]?.total || 0;

    // Combined Pending Receive (Split, Loan & Expense (Status: Pending))
    const pendingReceiveTotal = pendingReceiveLoans + pendingReceiveExpenses;

    // 5. Pending Pay Loans: from To Pay Type: Loan (Status: Pending)
    const pendingPayLoansRes = await ToPay.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: { $regex: /^loan$/i },
          $and: [
            {
              $or: [
                { paymentStatus: "Pending" },
                { paymentStatus: { $exists: false } },
                { paymentStatus: null },
              ],
            },
            {
              paymentStatus: { $ne: "Paid" },
            },
            {
              status: { $ne: "Paid" },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingPayLoans = pendingPayLoansRes[0]?.total || 0;

    // 6. Pending Pay Expenses: from To Pay Type: Expenses (Status: Pending)
    const pendingPayExpensesRes = await ToPay.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: { $regex: /^expenses?$/i },
          $and: [
            {
              $or: [
                { paymentStatus: "Pending" },
                { paymentStatus: { $exists: false } },
                { paymentStatus: null },
              ],
            },
            {
              paymentStatus: { $ne: "Paid" },
            },
            {
              status: { $ne: "Paid" },
            },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const pendingPayExpenses = pendingPayExpensesRes[0]?.total || 0;

    // To Pay (Loan & Expense (Status: Paid))
    const toPayPaidRes = await ToPay.aggregate([
      {
        $match: {
          userId: userObjectId,
          type: { $in: ["Loan", "Expense", "Expenses", "Paid"] },
          $or: [
            { paymentStatus: "Paid" },
            { status: "Paid" },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const toPayPaid = toPayPaidRes[0]?.total || 0;

    // Total Balance = For Self (Add balance) - Total Expenses - To Receive (Split, Loan & Expense (Status: Pending)) - To Pay (Loan & Expense (Status: Paid))
    const totalBalance = totalAddBalance - totalExpenses - pendingReceiveTotal - toPayPaid;

    res.json({
      success: true,
      data: {
        totalBalance: Math.trunc(totalBalance),
        totalExpenses: Math.trunc(totalExpenses),
        pendingReceiveLoans: Math.trunc(pendingReceiveLoans),
        pendingReceiveExpenses: Math.trunc(pendingReceiveExpenses),
        pendingReceiveTotal: Math.trunc(pendingReceiveTotal),
        pendingPayLoans: Math.trunc(pendingPayLoans),
        pendingPayExpenses: Math.trunc(pendingPayExpenses),
        toPayPaid: Math.trunc(toPayPaid),
        totalAddBalance: Math.trunc(totalAddBalance),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboardStats };
