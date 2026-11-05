const Profile = require('../models/Profile');
const Member = require('../models/Member');

// Helper to seed initial profile if none exists
const getOrCreateDefaultProfile = async () => {
  let profile = await Profile.findOne();
  if (!profile) {
    const member = (await Member.findOne({ email: /deep/i })) || (await Member.findOne());
    const initialData = {
      fullName: member ? member.fullName : 'Deep Bhimani',
      email: member && member.email ? member.email : 'deep.bhimani@shunyavkash.com',
      phoneNumber: member && member.phoneNumber ? member.phoneNumber : '+91 6359276907',
      username: member && member.username ? member.username : 'deepBhimani',
      role: 'Admin',
      bio: 'Personal Finance & Expense Manager on MoneyFlow',
      avatarColor: '#1976d2',
    };
    profile = await Profile.create(initialData);
  }
  return profile;
};

// @desc    Get user profile
// @route   GET /api/profile
const getProfile = async (req, res) => {
  try {
    const profile = await getOrCreateDefaultProfile();
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
const updateProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne();
    if (!profile) {
      profile = await getOrCreateDefaultProfile();
    }

    const {
      fullName,
      email,
      phoneNumber,
      username,
      role,
      bio,
      avatarColor,
    } = req.body;

    if (fullName !== undefined) profile.fullName = fullName.trim();
    if (email !== undefined) profile.email = email.trim();
    if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber.trim();
    if (username !== undefined) profile.username = username.trim();
    if (role !== undefined) {
      const targetRole = role.trim();
      if (profile.role === 'Admin' && targetRole === 'Member') {
        const otherAdminCount = await Member.countDocuments({ role: 'Admin' });
        if (otherAdminCount === 0) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the only Admin in the system. There must always be at least one Admin.',
          });
        }
      }
      profile.role = targetRole;
    }
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
