const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const Profile = require('../models/Profile');
const { sendPasswordResetEmail } = require('../utils/email');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
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
    role: user.role || 'Member',
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
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmail = await Member.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
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
          message: 'Username is already taken. Please choose another.',
        });
      }
    } else {
      cleanUsername = cleanEmail.split('@')[0];
    }

    // If no members exist yet, the first user is Admin, otherwise Member
    const memberCount = await Member.countDocuments();
    const role = memberCount === 0 ? 'Admin' : 'Member';

    const newMember = new Member({
      fullName: fullName.trim(),
      email: cleanEmail,
      username: cleanUsername,
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      password,
      role,
      avatarColor: '#1976d2',
      joinDate: new Date(),
    });

    await newMember.save();

    const token = generateToken(newMember);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
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
        message: 'Please provide your email or username and password',
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
            role: profile.role || 'Admin',
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
        message: 'Invalid email/username or password. Please check your credentials.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password. Please check your credentials.',
      });
    }

    // Silently upgrade plain-text passwords to bcrypt hash for enhanced security
    if (user.password && !user.password.startsWith('$2a$') && !user.password.startsWith('$2b$')) {
      user.password = password;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully',
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
      return res.status(401).json({ success: false, message: 'Not authenticated' });
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
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const member = await Member.findOne({ email: cleanEmail });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'No account found with that email address. Please verify or create an account.',
      });
    }

    // Generate secure random reset token
    const token = crypto.randomBytes(32).toString('hex');
    member.resetPasswordToken = token;
    member.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await member.save();

    // Determine correct app URL
    let appUrl = 'https://moneyflow-5a2a.onrender.com';
    if (req.headers.origin) {
      appUrl = req.headers.origin;
    } else if (req.headers.referer) {
      try {
        const u = new URL(req.headers.referer);
        appUrl = `${u.protocol}//${u.host}`;
      } catch (e) {}
    } else if (process.env.APP_URL) {
      appUrl = process.env.APP_URL;
    }
    appUrl = appUrl.replace(/\/+$/, '');

    const resetLink = `${appUrl}/reset-password?token=${token}`;
    const resetCode = token.slice(0, 8).toUpperCase();

    const emailResult = await sendPasswordResetEmail({
      toEmail: member.email,
      fullName: member.fullName,
      resetLink,
      resetCode,
    });

    if (!emailResult.success) {
      console.warn('[Forgot Password Email Notice]:', emailResult.error);
    }

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email address.',
      email: member.email,
      // For local testing convenience if SMTP/Brevo is in sandbox mode
      resetToken: process.env.NODE_ENV !== 'production' ? token : undefined,
    });
  } catch (error) {
    console.error('[Auth Forgot Password Error]:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error processing request' });
  }
};

// @desc    Verify if a password reset token is valid
// @route   GET /api/auth/verify-reset-token/:token
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    const member = await Member.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: member.email,
      fullName: member.fullName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Reset token is required' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const member = await Member.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        message: 'Password reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash it)
    member.password = newPassword;
    member.resetPasswordToken = null;
    member.resetPasswordExpires = null;
    await member.save();

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
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
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const member = await Member.findById(req.user._id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await member.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    member.password = newPassword;
    await member.save();

    res.json({
      success: true,
      message: 'Password updated successfully!',
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
