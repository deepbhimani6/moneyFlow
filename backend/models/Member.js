const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { capitalizeName } = require('../utils/formatters');

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
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    avatarColor: {
      type: String,
      default: '#1976d2',
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
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordCode: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Automatically capitalize fullName before saving
memberSchema.pre('save', function () {
  if (this.isModified('fullName') && this.fullName) {
    this.fullName = capitalizeName(this.fullName);
  }
});

// Hash password before saving if modified and not already hashed
memberSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  // If already hashed with bcrypt, do not re-hash
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare candidate password with stored password (supports both bcrypt and legacy plain text)
memberSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
    return await bcrypt.compare(candidatePassword, this.password);
  }
  return this.password === candidatePassword;
};

module.exports = mongoose.model('Member', memberSchema, 'members');
