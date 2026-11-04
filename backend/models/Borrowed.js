const mongoose = require("mongoose");

const borrowedSchema = new mongoose.Schema(
  {
    personName: {
      type: String,
      required: [true, "Person / Lender name is required"],
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    type: {
      type: String,
      enum: ["Expense", "Borrowed", "Loan"],
      default: "Expense",
    },
    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    date: {
      type: String,
      required: true, // Format: YYYY-MM-DD
    },
    time: {
      type: String,
      required: true, // Format: HH:mm
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Borrowed", borrowedSchema);
