const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      default: 'Deep Bhimani',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'deep.bhimani@shunyavkash.com',
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: '+91 6359276907',
    },
    username: {
      type: String,
      trim: true,
      default: 'deepBhimani',
    },
    role: {
      type: String,
      trim: true,
      default: 'Admin',
    },
    bio: {
      type: String,
      trim: true,
      default: 'Personal Finance & Expense Manager on MoneyFlow',
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
    },
    avatarColor: {
      type: String,
      default: '#1976d2',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    defaultPaymentMode: {
      type: String,
      default: 'UPI',
    },
    dateFormat: {
      type: String,
      default: 'DD-MM-YYYY',
    },
    notifications: {
      emailAlerts: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      splitAlerts: { type: Boolean, default: true },
    },
    linkedMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
