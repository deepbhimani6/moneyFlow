const Profile = require('../models/Profile');
const Member = require('../models/Member');
const { capitalizeName } = require('../utils/formatters');

// Helper to seed initial profile if none exists
const getOrCreateDefaultProfile = async () => {
  let profile = await Profile.findOne();
  if (!profile) {
    const member = await Member.findOne();
    const initialData = {
      fullName: member ? member.fullName : 'User',
      email: member && member.email ? member.email : 'user@moneyflow.local',
      phoneNumber: member && member.phoneNumber ? member.phoneNumber : '',
      username: member && member.username ? member.username : 'user',
      bio: member && member.bio ? member.bio : 'Personal Finance & Expense Manager on MoneyFlow',
      avatarColor: member && member.avatarColor ? member.avatarColor : '#1976d2',
    };
    profile = await Profile.create(initialData);
  }
  return profile;
};

// @desc    Get user profile for currently authenticated user
// @route   GET /api/profile
const getProfile = async (req, res) => {
  try {
    let member = null;
    if (req.user && req.user._id) {
      member = await Member.findById(req.user._id).select('-password');
    }
    if (!member && req.user && req.user.email) {
      member = await Member.findOne({ email: req.user.email.toLowerCase() }).select('-password');
    }

    if (member) {
      return res.json({
        success: true,
        data: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email,
          phoneNumber: member.phoneNumber || '',
          username: member.username || '',
          bio: member.bio || '',
          avatarColor: member.avatarColor || '#1976d2',
          joinDate: member.joinDate || member.createdAt,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        },
      });
    }

    const defaultProfile = await getOrCreateDefaultProfile();
    res.json({ success: true, data: defaultProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile for currently authenticated user
// @route   PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    let member = null;
    if (req.user && req.user._id) {
      member = await Member.findById(req.user._id);
    }
    if (!member && req.user && req.user.email) {
      member = await Member.findOne({ email: req.user.email.toLowerCase() });
    }

    const {
      fullName,
      email,
      phoneNumber,
      username,
      bio,
      avatarColor,
    } = req.body;

    if (member) {
      if (fullName !== undefined) member.fullName = capitalizeName(fullName);
      if (email !== undefined) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail && cleanEmail !== (member.email || '').toLowerCase()) {
          const existingEmail = await Member.findOne({
            email: cleanEmail,
            _id: { $ne: member._id },
          });
          if (existingEmail) {
            return res.status(400).json({
              success: false,
              message: 'An account with this email address already exists.',
            });
          }
          member.email = cleanEmail;
        }
      }
      if (phoneNumber !== undefined) member.phoneNumber = phoneNumber.trim();
      if (username !== undefined) {
        const cleanUsername = username.trim();
        if (cleanUsername && cleanUsername.toLowerCase() !== (member.username || '').toLowerCase()) {
          const existingUsername = await Member.findOne({
            username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') },
            _id: { $ne: member._id },
          });
          if (existingUsername) {
            return res.status(400).json({
              success: false,
              message: 'Username is already taken. Please choose another.',
            });
          }
          member.username = cleanUsername;
        }
      }
      if (bio !== undefined) member.bio = bio.trim();
      if (avatarColor !== undefined) member.avatarColor = avatarColor;

      await member.save();

      // Also keep legacy Profile document in sync if applicable
      const profile = await Profile.findOne({
        $or: [
          { email: member.email },
          { username: member.username },
        ],
      });
      if (profile) {
        profile.fullName = member.fullName;
        profile.email = member.email;
        profile.phoneNumber = member.phoneNumber;
        profile.username = member.username;
        profile.bio = member.bio;
        profile.avatarColor = member.avatarColor;
        await profile.save();
      }

      const sanitized = {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        phoneNumber: member.phoneNumber || '',
        username: member.username || '',
        bio: member.bio || '',
        avatarColor: member.avatarColor || '#1976d2',
        joinDate: member.joinDate || member.createdAt,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      };

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: sanitized,
      });
    }

    // Fallback if not authenticated or no member document
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await getOrCreateDefaultProfile();
    }

    if (fullName !== undefined) profile.fullName = capitalizeName(fullName);
    if (email !== undefined) profile.email = email.trim();
    if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber.trim();
    if (username !== undefined) profile.username = username.trim();
    if (bio !== undefined) profile.bio = bio.trim();
    if (avatarColor !== undefined) profile.avatarColor = avatarColor;

    const updatedProfile = await profile.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset user profile
// @route   POST /api/profile/reset
const resetProfile = async (req, res) => {
  try {
    let member = null;
    if (req.user && req.user._id) {
      member = await Member.findById(req.user._id).select('-password');
    }
    if (member) {
      return res.json({
        success: true,
        message: 'Profile reloaded successfully',
        data: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email,
          phoneNumber: member.phoneNumber || '',
          username: member.username || '',
          bio: member.bio || '',
          avatarColor: member.avatarColor || '#1976d2',
          joinDate: member.joinDate || member.createdAt,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        },
      });
    }

    await Profile.deleteMany({});
    const newProfile = await getOrCreateDefaultProfile();
    res.json({
      success: true,
      message: 'Profile reset to default successfully',
      data: newProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  resetProfile,
};
