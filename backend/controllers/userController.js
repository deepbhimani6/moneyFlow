const Member = require('../models/Member');
const Entry = require('../models/Entry');
const ToPay = require('../models/ToPay');
const ForSelf = require('../models/ForSelf');
const { sendInviteEmail } = require('../utils/email');
const { capitalizeName } = require('../utils/formatters');
const crypto = require('crypto');

// Generate secure random password
const generateSecurePassword = (length = 10) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  let pwd = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    special[crypto.randomInt(0, special.length)],
  ];
  const allChars = upper + lower + digits + special;
  for (let i = pwd.length; i < length; i++) {
    pwd.push(allChars[crypto.randomInt(0, allChars.length)]);
  }
  return pwd.sort(() => Math.random() - 0.5).join('');
};

const getAppUrl = (req) => {
  if (process.env.APP_URL && process.env.APP_URL.trim()) {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost:5000') && !origin.includes('localhost:5050')) {
    return origin.replace(/\/+$/, '');
  }
  return 'https://moneyflow-5a2a.onrender.com';
};

// @desc    Get all registered users in the app (Admin only)
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user ? req.user._id : null;

    const andConditions = [
      { _id: { $ne: currentUserId } },
    ];

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { fullName: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
          { phoneNumber: { $regex: search.trim(), $options: 'i' } },
          { username: { $regex: search.trim(), $options: 'i' } },
        ],
      });
    }

    const users = await Member.find({ $and: andConditions }).sort({ createdAt: -1 });

    // Auto-heal capitalization
    for (const u of users) {
      if (u.fullName) {
        const capitalized = capitalizeName(u.fullName);
        if (u.fullName !== capitalized) {
          u.fullName = capitalized;
          Member.updateOne({ _id: u._id }, { $set: { fullName: capitalized } }).exec();
        }
      }
    }

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new user & optionally send invite link (Admin only)
// @route   POST /api/users
const createUser = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, username, password, sendLink } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const existingUser = await Member.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email address already exists.',
      });
    }

    let cleanUsername = username ? username.trim() : cleanEmail.split('@')[0];
    if (cleanUsername) {
      const existingUsername = await Member.findOne({
        username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (existingUsername) {
        cleanUsername = `${cleanUsername}${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const temporaryPassword = (password && password.trim().length >= 6)
      ? password.trim()
      : generateSecurePassword();

    const newUser = new Member({
      fullName: capitalizeName(fullName),
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      email: cleanEmail,
      username: cleanUsername,
      password: temporaryPassword,
      invitedBy: req.user ? req.user._id : null,
      createdBy: req.user ? req.user._id : null,
      joinDate: null,
      hasLoggedIn: false,
    });

    if (sendLink) {
      const appUrl = getAppUrl(req);
      const emailResult = await sendInviteEmail({
        toEmail: newUser.email,
        fullName: newUser.fullName,
        username: newUser.username,
        temporaryPassword: temporaryPassword,
        inviteLink: appUrl,
      });

      if (emailResult.success) {
        newUser.inviteSent = true;
        newUser.lastInviteSentAt = new Date();
      }
    } else {
      newUser.inviteSent = false;
      newUser.lastInviteSentAt = null;
    }

    await newUser.save();

    // Auto-link to admin's directory
    if (req.user && req.user._id) {
      await Member.findByIdAndUpdate(req.user._id, {
        $addToSet: { members: newUser._id },
      });
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully.',
      temporaryPassword,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user details (Admin only)
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, username } = req.body;
    const user = await Member.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (fullName !== undefined) user.fullName = capitalizeName(fullName);
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber ? phoneNumber.trim() : '';
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== (user.email || '').toLowerCase()) {
        const existingEmail = await Member.findOne({
          email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: user._id },
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'This email address already exists.',
          });
        }
        user.email = cleanEmail;
      }
    }

    if (username !== undefined) {
      const cleanUsername = username.trim();
      if (cleanUsername && cleanUsername !== user.username) {
        const existingUsername = await Member.findOne({
          username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: user._id },
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: 'This username already exists.',
          });
        }
        user.username = cleanUsername;
      }
    }

    await user.save();
    res.json({ success: true, data: user, message: 'User updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a user without restrictions (Admin only)
// @route   DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await Member.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Never delete current logged in admin account
    const currentUserId = req.user ? String(req.user._id) : null;
    const currentUserEmail = req.user && req.user.email ? req.user.email.toLowerCase().trim() : null;

    if (
      (currentUserId && String(user._id) === currentUserId) ||
      (currentUserEmail && user.email && user.email.toLowerCase().trim() === currentUserEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your logged-in account.',
      });
    }

    // Admin can delete all person without restrictions
    await Member.findByIdAndDelete(user._id);
    await Member.updateMany({}, { $pull: { members: user._id } });

    res.json({
      success: true,
      message: `User '${user.fullName}' deleted.`,
      deletedUserName: user.fullName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete users without restrictions (Admin only)
// @route   POST /api/users/bulk-delete
const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected.' });
    }

    const currentUserId = req.user ? String(req.user._id) : null;
    const validIds = ids.filter((id) => String(id) !== currentUserId);

    // Admin deletes all selected persons completely without restrictions
    await Member.deleteMany({ _id: { $in: validIds } });
    await Member.updateMany({}, { $pull: { members: { $in: validIds } } });

    res.json({
      success: true,
      message: `${validIds.length} user(s) deleted.`,
      deletedUsersCount: validIds.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send invite email to a single user (Admin only)
// @route   POST /api/users/:id/invite
const sendInviteToUser = async (req, res) => {
  try {
    const user = await Member.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.email || !user.email.trim()) {
      return res.status(400).json({
        success: false,
        message: `${user.fullName} does not have an email address.`,
      });
    }

    if (user.hasLoggedIn || user.joinDate) {
      return res.status(400).json({
        success: false,
        message: `${user.fullName} has already joined the app.`,
      });
    }

    const appUrl = getAppUrl(req);
    let temporaryPassword = user.password;
    if (!temporaryPassword || temporaryPassword.startsWith('$2a$') || temporaryPassword.startsWith('$2b$')) {
      temporaryPassword = generateSecurePassword();
      user.password = temporaryPassword;
    }

    const emailResult = await sendInviteEmail({
      toEmail: user.email,
      fullName: user.fullName,
      username: user.username,
      temporaryPassword,
      inviteLink: appUrl,
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: `Email failed: ${emailResult.error}` });
    }

    user.inviteSent = true;
    user.lastInviteSentAt = new Date();
    await user.save();

    res.json({ success: true, message: `Invite sent to ${user.email}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk send invite link to multiple users (Admin only)
// @route   POST /api/users/bulk-invite
const bulkInviteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No users selected.' });
    }

    const users = await Member.find({ _id: { $in: ids } });
    const appUrl = getAppUrl(req);
    const missingEmailUsers = users.filter((u) => !u.email || !u.email.trim()).map((u) => u.fullName);
    const alreadyJoinedUsers = users.filter((u) => u.hasLoggedIn || u.joinDate).map((u) => u.fullName);
    const validUsers = users.filter((u) => u.email && u.email.trim() && !u.hasLoggedIn && !u.joinDate);

    if (validUsers.length === 0) {
      if (alreadyJoinedUsers.length > 0 && missingEmailUsers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected user(s) have already joined the app.',
          sentCount: 0,
          failedCount: 0,
          alreadyJoinedUsers,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Selected users do not have an email address or have already joined.',
        sentCount: 0,
        failedCount: 0,
        missingEmailUsers,
        alreadyJoinedUsers,
      });
    }

    const results = await Promise.allSettled(
      validUsers.map(async (user) => {
        let temporaryPassword = user.password;
        if (!temporaryPassword || temporaryPassword.startsWith('$2a$') || temporaryPassword.startsWith('$2b$')) {
          temporaryPassword = generateSecurePassword();
          user.password = temporaryPassword;
        }

        const emailResult = await sendInviteEmail({
          toEmail: user.email,
          fullName: user.fullName,
          username: user.username,
          temporaryPassword,
          inviteLink: appUrl,
        });

        if (emailResult.success) {
          user.inviteSent = true;
          user.lastInviteSentAt = new Date();
          await user.save();
          return { success: true, email: user.email };
        } else {
          throw new Error(emailResult.error || 'Failed to deliver email');
        }
      })
    );

    let sentCount = 0;
    let failedCount = 0;
    results.forEach((r) => {
      if (r.status === 'fulfilled') sentCount++;
      else failedCount++;
    });

    res.json({
      success: true,
      message: `Sent ${sentCount} invite(s). ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
      sentCount,
      failedCount,
      missingEmailUsers,
      alreadyJoinedUsers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get summary of entries associated with a user before deletion (Admin only)
// @route   GET /api/users/:id/entries-summary
const getUserEntriesSummary = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Member.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const entries = await Entry.find({ memberId: userId });
    const toPayEntries = await ToPay.find({ memberId: userId });
    const forSelfEntries = await ForSelf.find({ memberId: userId });

    const totalCount = entries.length + toPayEntries.length + forSelfEntries.length;
    const totalAmount =
      entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      toPayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      forSelfEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        hasEntries: totalCount > 0,
        entryCount: totalCount,
        totalAmount,
        userName: user.fullName,
        entriesBreakdown: {
          toReceive: entries.length,
          toPay: toPayEntries.length,
          forSelf: forSelfEntries.length,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bulk summary of entries for multiple users (Admin only)
// @route   POST /api/users/bulk-entries-summary
const getBulkUsersEntriesSummary = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No user IDs provided.' });
    }

    const entries = await Entry.find({ memberId: { $in: ids } });
    const toPayEntries = await ToPay.find({ memberId: { $in: ids } });
    const forSelfEntries = await ForSelf.find({ memberId: { $in: ids } });

    const totalCount = entries.length + toPayEntries.length + forSelfEntries.length;
    const totalAmount =
      entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      toPayEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) +
      forSelfEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      success: true,
      data: {
        hasEntries: totalCount > 0,
        entryCount: totalCount,
        totalAmount,
        selectedUsersCount: ids.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  sendInviteToUser,
  bulkInviteUsers,
  getUserEntriesSummary,
  getBulkUsersEntriesSummary,
};
