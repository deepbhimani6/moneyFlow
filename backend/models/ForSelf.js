const mongoose = require("mongoose");

const forSelfSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Add Balance", "Expense"],
      required: [true, "Type is required"],
      default: "Expense",
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
    // Metadata if generated from a split in To Receive
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForSelf", forSelfSchema);
