const Profile = require('../models/Profile');
const Member = require('../models/Member');

// Helper to seed initial profile if none exists
const getOrCreateDefaultProfile = async () => {
  let profile = await Profile.findOne();
  if (!profile) {
    // Attempt to seed from first member or deep.bhimani if found
    const member = (await Member.findOne({ email: /deep/i })) || (await Member.findOne());
    const initialData = {
      fullName: member ? member.fullName : 'Deep Bhimani',
      email: member && member.email ? member.email : 'deep.bhimani@shunyavkash.com',
      phoneNumber: member && member.phoneNumber ? member.phoneNumber : '+91 6359276907',
      username: member && member.username ? member.username : 'deepBhimani',
      role: 'Account Owner',
      bio: 'Personal Finance & Expense Manager on MoneyFlow',
      avatarUrl: '',
      avatarColor: '#1976d2',
      currency: 'INR',
      currencySymbol: '₹',
      defaultPaymentMode: 'UPI',
      dateFormat: 'DD-MM-YYYY',
      notifications: {
        emailAlerts: true,
        dailyDigest: false,
        splitAlerts: true,
      },
      linkedMemberId: member ? member._id : null,
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
      avatarUrl,
      avatarColor,
      currency,
      currencySymbol,
      defaultPaymentMode,
      dateFormat,
      notifications,
      linkedMemberId,
    } = req.body;

    if (fullName !== undefined) profile.fullName = fullName.trim();
    if (email !== undefined) profile.email = email.trim();
    if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber.trim();
    if (username !== undefined) profile.username = username.trim();
    if (role !== undefined) profile.role = role.trim();
    if (bio !== undefined) profile.bio = bio.trim();
    if (avatarUrl !== undefined) profile.avatarUrl = avatarUrl.trim();
    if (avatarColor !== undefined) profile.avatarColor = avatarColor;
    if (currency !== undefined) profile.currency = currency;
    if (currencySymbol !== undefined) profile.currencySymbol = currencySymbol;
    if (defaultPaymentMode !== undefined) profile.defaultPaymentMode = defaultPaymentMode;
    if (dateFormat !== undefined) profile.dateFormat = dateFormat;
    if (notifications !== undefined) profile.notifications = { ...profile.notifications, ...notifications };
    if (linkedMemberId !== undefined) profile.linkedMemberId = linkedMemberId || null;

    const updatedProfile = await profile.save();

    // Optionally update linked member if matching ID
    if (profile.linkedMemberId) {
      try {
        await Member.findByIdAndUpdate(profile.linkedMemberId, {
          fullName: profile.fullName,
          phoneNumber: profile.phoneNumber,
          email: profile.email,
          username: profile.username,
        });
      } catch (err) {
        console.warn('Could not sync with linked member:', err.message);
      }
    }

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
