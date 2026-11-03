const Member = require('../models/Member');
const { sendInviteEmail } = require('../utils/email');

// @desc    Get all members
// @route   GET /api/members
const getMembers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      query = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phoneNumber: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const members = await Member.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: members.length, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new member & optionally send invite link
// @route   POST /api/members
const createMember = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, username, password, sendLink } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required' });
    }

    const existingMember = await Member.findOne({ email: email.toLowerCase() });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'Member with this email already exists' });
    }

    const member = new Member({
      fullName,
      phoneNumber: phoneNumber || '',
      email: email.toLowerCase(),
      username: username || '',
      password: password || '',
      joinDate: new Date(),
    });

    // Check if invite link checkbox was checked
    if (sendLink) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const emailResult = await sendInviteEmail({
        toEmail: member.email,
        fullName: member.fullName,
        username: member.username,
        temporaryPassword: member.password,
        inviteLink: appUrl,
      });

      if (emailResult.success) {
        member.inviteSent = true;
        member.lastInviteSentAt = new Date();
      }
    }

    await member.save();

    res.status(201).json({ success: true, data: member, message: 'Member created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
const updateMember = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, username, password } = req.body;
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(400).json({ success: false, message: 'Member not found' });
    }

    if (fullName !== undefined) member.fullName = fullName;
    if (phoneNumber !== undefined) member.phoneNumber = phoneNumber;
    if (email !== undefined) member.email = email.toLowerCase();
    if (username !== undefined) member.username = username;
    if (password !== undefined && password !== '') member.password = password;

    await member.save();
    res.json({ success: true, data: member, message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single member
// @route   DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    await Member.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete members
// @route   POST /api/members/bulk-delete
const bulkDeleteMembers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No member IDs provided for deletion' });
    }

    const result = await Member.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, message: `${result.deletedCount} members deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send invite email to a single member
// @route   POST /api/members/:id/invite
const sendInviteToMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const emailResult = await sendInviteEmail({
      toEmail: member.email,
      fullName: member.fullName,
      username: member.username,
      temporaryPassword: member.password,
      inviteLink: appUrl,
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: `Email failed: ${emailResult.error}` });
    }

    member.inviteSent = true;
    member.lastInviteSentAt = new Date();
    await member.save();

    res.json({ success: true, message: `Invite link sent to ${member.email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk send invite link to multiple members
// @route   POST /api/members/bulk-invite
const bulkInviteMembers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No member IDs provided' });
    }

    const members = await Member.find({ _id: { $in: ids } });
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    let sentCount = 0;
    let failedCount = 0;

    for (const member of members) {
      const emailResult = await sendInviteEmail({
        toEmail: member.email,
        fullName: member.fullName,
        username: member.username,
        temporaryPassword: member.password,
        inviteLink: appUrl,
      });

      if (emailResult.success) {
        member.inviteSent = true;
        member.lastInviteSentAt = new Date();
        await member.save();
        sentCount++;
      } else {
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: `Invites sent: ${sentCount}, failed: ${failedCount}`,
      sentCount,
      failedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  sendInviteToMember,
  bulkInviteMembers,
};
