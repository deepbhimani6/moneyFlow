const mongoose = require('mongoose');
const { capitalizeName } = require('../utils/formatters');

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
    avatarColor: {
      type: String,
      default: '#1976d2',
    },
  },
  { timestamps: true }
);

profileSchema.pre('save', function () {
  if (this.isModified('fullName') && this.fullName) {
    this.fullName = capitalizeName(this.fullName);
  }
});

module.exports = mongoose.model('Profile', profileSchema, 'profile');
