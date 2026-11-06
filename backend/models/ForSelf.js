const mongoose = require("mongoose");

const forSelfSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      index: true,
      default: null,
    },
    forFromName: {
      type: String,
      trim: true,
      default: "Myself (You)",
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    type: {
      type: String,
      enum: ["Add Balance", "Expense", "Split"],
      required: [true, "Type is required"],
      default: "Expense",
    },
    status: {
      type: String,
      default: "Expense",
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid",
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
    isMine: {
      type: Boolean,
      default: true,
    },
    creatorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      index: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForSelf", forSelfSchema, "for-self");
