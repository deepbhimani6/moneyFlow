const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const Profile = require('../models/Profile');
const { sendPasswordResetEmail } = require('../utils/email');
const { capitalizeName } = require('../utils/formatters');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const getSanitizedUser = (user) => {
  return {
    _id: user._id,
    fullName: user.fullName || '',
    email: user.email || '',
    username: user.username || '',
    phoneNumber: user.phoneNumber || '',
    bio: user.bio || '',
    avatarColor: user.avatarColor || '#1976d2',
    joinDate: user.joinDate || user.createdAt,
    createdAt: user.createdAt,
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { fullName, email, username, phoneNumber, password } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await Member.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existingEmail) {
      if (existingEmail.hasLoggedIn || existingEmail.joinDate) {
        return res.status(400).json({
          success: false,
          message: 'This email address already exists.',
        });
      }

      // If member was previously invited/added but hasn't joined yet, allow them to join and set their own personal profile
      existingEmail.fullName = capitalizeName(fullName);
      existingEmail.phoneNumber = phoneNumber ? phoneNumber.trim() : '';
      if (cleanUsername) existingEmail.username = cleanUsername;
      existingEmail.password = password;
      existingEmail.hasLoggedIn = true;
      existingEmail.joinDate = new Date();
      await existingEmail.save();

      // Reciprocal link between inviter and new member
      if (existingEmail.invitedBy && !existingEmail.inviterLinked) {
        const inviter = await Member.findById(existingEmail.invitedBy);
        if (inviter) {
          const inviterIdStr = inviter._id.toString();
          const newIdStr = existingEmail._id.toString();

          // Initialize custom directories on new member
          if (!existingEmail.members) existingEmail.members = [];
          if (!existingEmail.memberCustomNames) existingEmail.memberCustomNames = new Map();
          if (!existingEmail.memberCustomPhoneNumbers) existingEmail.memberCustomPhoneNumbers = new Map();
          if (!existingEmail.members.some((id) => String(id) === inviterIdStr)) {
            existingEmail.members.push(inviter._id);
          }
          existingEmail.memberCustomNames.set(inviterIdStr, inviter.fullName);
          existingEmail.memberCustomPhoneNumbers.set(inviterIdStr, inviter.phoneNumber || '');
          existingEmail.inviterLinked = true;
          await existingEmail.save();

          // Initialize custom directories on inviter if not already set
          if (!inviter.members) inviter.members = [];
          if (!inviter.memberCustomNames) inviter.memberCustomNames = new Map();
          if (!inviter.memberCustomPhoneNumbers) inviter.memberCustomPhoneNumbers = new Map();
          if (!inviter.members.some((id) => String(id) === newIdStr)) {
            inviter.members.push(existingEmail._id);
          }
          const hasInviterCustomName = typeof inviter.memberCustomNames.get === 'function'
            ? inviter.memberCustomNames.has(newIdStr)
            : inviter.memberCustomNames[newIdStr] !== undefined;
          if (!hasInviterCustomName) {
            inviter.memberCustomNames.set(newIdStr, existingEmail.fullName);
          }
          const hasInviterCustomPhone = typeof inviter.memberCustomPhoneNumbers.get === 'function'
            ? inviter.memberCustomPhoneNumbers.has(newIdStr)
            : inviter.memberCustomPhoneNumbers[newIdStr] !== undefined;
          if (!hasInviterCustomPhone) {
            inviter.memberCustomPhoneNumbers.set(newIdStr, existingEmail.phoneNumber || '');
          }
          await inviter.save();
        } else {
          existingEmail.inviterLinked = true;
          await existingEmail.save();
        }
      }

      const token = generateToken(existingEmail);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully.',
        token,
        user: getSanitizedUser(existingEmail),
      });
    }

    let cleanUsername = username ? username.trim() : '';
    if (cleanUsername) {
      const existingUsername = await Member.findOne({
        username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') },
      });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'This username already exists.',
        });
      }
    } else {
      cleanUsername = cleanEmail.split('@')[0];
    }

    const newMember = new Member({
      fullName: capitalizeName(fullName),
      email: cleanEmail,
      username: cleanUsername,
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      password,
      avatarColor: '#1976d2',
      joinDate: new Date(),
      hasLoggedIn: true,
    });

    await newMember.save();

    const token = generateToken(newMember);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: getSanitizedUser(newMember),
    });
  } catch (error) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email or username and password are required.',
      });
    }

    const cleanIdentifier = identifier.trim();

    // Search by email or username
    let user = await Member.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
      ],
    });

    // Fallback: If not found in Member, check Profile collection
    if (!user) {
      const profile = await Profile.findOne({
        $or: [
          { email: cleanIdentifier.toLowerCase() },
          { username: { $regex: new RegExp(`^${cleanIdentifier}$`, 'i') } },
        ],
      });

      if (profile) {
        // Find if a member exists with same email
        user = await Member.findOne({ email: profile.email.toLowerCase() });
        if (!user) {
          // Auto-seed this admin user into members so login works smoothly
          user = new Member({
            fullName: profile.fullName,
            email: profile.email.toLowerCase(),
            username: profile.username,
            phoneNumber: profile.phoneNumber,
            password: password, // will be hashed by pre-save hook
            avatarColor: profile.avatarColor || '#1976d2',
            bio: profile.bio || '',
          });
          await user.save();
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password.',
      });
    }

    // Silently upgrade plain-text passwords to bcrypt hash for enhanced security
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await Member.findByIdAndUpdate(user._id, { $set: { password: hashedPassword } });
    }

    // When an invited member logs in with email & password:
    // 1. Reciprocal linking between inviter and invited member
    if (user.invitedBy && !user.inviterLinked) {
      const inviter = await Member.findById(user.invitedBy);
      if (inviter) {
        const inviterIdStr = inviter._id.toString();
        const userIdStr = user._id.toString();

        if (!user.members) user.members = [];
        if (!user.memberCustomNames) user.memberCustomNames = new Map();
        if (!user.memberCustomPhoneNumbers) user.memberCustomPhoneNumbers = new Map();
        if (!user.members.some((id) => String(id) === inviterIdStr)) {
          user.members.push(inviter._id);
        }
        user.memberCustomNames.set(inviterIdStr, inviter.fullName);
        user.memberCustomPhoneNumbers.set(inviterIdStr, inviter.phoneNumber || '');
        user.inviterLinked = true;
        await user.save();

        if (!inviter.members) inviter.members = [];
        if (!inviter.memberCustomNames) inviter.memberCustomNames = new Map();
        if (!inviter.memberCustomPhoneNumbers) inviter.memberCustomPhoneNumbers = new Map();
        if (!inviter.members.some((id) => String(id) === userIdStr)) {
          inviter.members.push(user._id);
        }
        const hasInviterCustomName = typeof inviter.memberCustomNames.get === 'function'
          ? inviter.memberCustomNames.has(userIdStr)
          : inviter.memberCustomNames[userIdStr] !== undefined;
        if (!hasInviterCustomName) {
          inviter.memberCustomNames.set(userIdStr, user.fullName);
        }
        const hasInviterCustomPhone = typeof inviter.memberCustomPhoneNumbers.get === 'function'
          ? inviter.memberCustomPhoneNumbers.has(userIdStr)
          : inviter.memberCustomPhoneNumbers[userIdStr] !== undefined;
        if (!hasInviterCustomPhone) {
          inviter.memberCustomPhoneNumbers.set(userIdStr, user.phoneNumber || '');
        }
        await inviter.save();
      } else {
        user.inviterLinked = true;
        await user.save();
      }
    }

    // 2. When a member logs in for the first time, record their joinDate and mark as logged in
    if (!user.hasLoggedIn || !user.joinDate) {
      const now = new Date();
      user.hasLoggedIn = true;
      user.joinDate = user.joinDate || now;
      await Member.findByIdAndUpdate(user._id, {
        $set: {
          hasLoggedIn: true,
          joinDate: user.joinDate,
        },
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: getSanitizedUser(user),
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

// @desc    Get currently logged-in user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    res.json({
      success: true,
      user: getSanitizedUser(req.user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate password reset request
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const member = await Member.findOne({ email: cleanEmail });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    // Generate secure random reset token and 6-digit verification code
    const token = crypto.randomBytes(32).toString('hex');
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    member.resetPasswordToken = token;
    member.resetPasswordCode = resetCode;
    member.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await member.save();

    const emailResult = await sendPasswordResetEmail({
      toEmail: member.email,
      fullName: member.fullName,
      resetCode,
    });

    if (!emailResult.success) {
      console.warn('[Forgot Password Email Notice]:', emailResult.error);
    }

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email.',
      email: member.email,
      resetCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined,
    });
  } catch (error) {
    console.error('[Auth Forgot Password Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error processing request' });
  }
};

// @desc    Verify if a password reset token or code is valid
// @route   GET /api/auth/verify-reset-token/:token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset code or token is required.' });
    }

    const cleanInput = token.trim();
    const member = await Member.findOne({
      resetPasswordExpires: { $gt: Date.now() },
      $or: [
        { resetPasswordToken: cleanInput },
        { resetPasswordCode: cleanInput },
        { resetPasswordCode: cleanInput.toUpperCase() },
      ],
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Password reset code is invalid or expired.',
      });
    }

    res.json({
      success: true,
      message: 'Code verified successfully.',
      email: member.email,
      fullName: member.fullName,
      token: member.resetPasswordToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using token or code
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Reset code or token is required.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const cleanInput = token.trim();
    const member = await Member.findOne({
      resetPasswordExpires: { $gt: Date.now() },
      $or: [
        { resetPasswordToken: cleanInput },
        { resetPasswordCode: cleanInput },
        { resetPasswordCode: cleanInput.toUpperCase() },
      ],
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Password reset code is invalid or expired.',
      });
    }

    // Set new password (pre-save hook will hash it)
    member.password = newPassword;
    member.resetPasswordToken = null;
    member.resetPasswordCode = null;
    member.resetPasswordExpires = null;
    await member.save();

    res.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    console.error('[Auth Reset Password Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error resetting password' });
  }
};

// @desc    Change password while logged in
// @route   POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const member = await Member.findById(req.user._id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await member.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    member.password = newPassword;
    await member.save();

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  changePassword,
};
