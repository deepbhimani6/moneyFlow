const mongoose = require("mongoose");
const { capitalizeName } = require("../utils/formatters");

const toPaySchema = new mongoose.Schema(
  {
    forFromName: {
      type: String,
      required: [true, "Member name is required"],
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    type: {
      type: String,
      enum: ["Add Balance", "Expense", "Loan", "Paid", "Split", "To Pay"],
      required: [true, "Type is required"],
      default: "Expense",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
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
      required: true, // Format: HH:mm
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

toPaySchema.pre("save", function () {
  if (this.isModified("forFromName") && this.forFromName) {
    this.forFromName = capitalizeName(this.forFromName);
  }
});

module.exports = mongoose.model("ToPay", toPaySchema, "to-pay");
