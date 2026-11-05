const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    username: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['Admin', 'Member'],
      default: 'Member',
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    inviteSent: {
      type: Boolean,
      default: false,
    },
    lastInviteSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Member', memberSchema);
