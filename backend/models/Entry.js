const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    forFromName: {
      type: String,
      required: [true, "For/From Name is required"],
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    type: {
      type: String,
      enum: ["Add Balance", "Expense", "Loan", "Received", "Split"],
      required: [true, "Type is required"],
      default: "Expense",
    },
    paymentStatus: {
      type: String,
      enum: ["Received", "Pending"],
      default: "Pending",
    },
    status: {
      type: String,
      default: function () {
        return this.type || "Expense";
      },
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
      required: true, // Format: HH:mm (or HH:mm:ss)
    },
    // Split metadata
    isSplit: {
      type: Boolean,
      default: false,
    },
    splitGroupId: {
      type: String,
      default: null,
    },
    originalTotalAmount: {
      type: Number,
      default: null,
    },
    isMine: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Entry", entrySchema);
