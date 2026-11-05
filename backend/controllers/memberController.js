const Member = require('../models/Member');
const Entry = require('../models/Entry');
const Profile = require('../models/Profile');
const { sendInviteEmail } = require('../utils/email');
const { getUniqueAdminCount, isMemberCurrentAdmin } = require('../utils/adminCheck');

const getAppUrl = (req) => {
  if (
    process.env.APP_URL &&
    !process.env.APP_URL.includes('moneyflow.onrender.com') &&
    !process.env.APP_URL.includes('localhost')
  ) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  return 'https://moneyflow-5a2a.onrender.com';
};

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
    const { fullName, phoneNumber, email, username, password, sendLink, role } = req.body;

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
      role: role === 'Admin' ? 'Admin' : 'Member',
      joinDate: new Date(),
    });

    // Check if invite link checkbox was checked
    if (sendLink) {
      const appUrl = getAppUrl(req);
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
    const { fullName, phoneNumber, email, username, password, role } = req.body;
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(400).json({ success: false, message: 'Member not found' });
    }

    if (fullName !== undefined) member.fullName = fullName;
    if (phoneNumber !== undefined) member.phoneNumber = phoneNumber;
    if (email !== undefined) member.email = email.toLowerCase();
    if (username !== undefined) member.username = username;
    if (password !== undefined && password !== '') member.password = password;
    if (role !== undefined) {
      const targetRole = role === 'Admin' ? 'Admin' : 'Member';
      if (member.role === 'Admin' && targetRole === 'Member') {
        const currentProfile = await Profile.findOne();
        if (isMemberCurrentAdmin(member, currentProfile)) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the current logged-in Admin account.',
          });
        }

        const adminCount = await getUniqueAdminCount();
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the only Admin in the system. There must always be at least one Admin.',
          });
        }
      }
      member.role = targetRole;
    }

    await member.save();
    res.json({ success: true, data: member, message: 'Member updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get summary of member's entries before deletion
// @route   GET /api/members/:id/entries-summary
const getMemberEntriesSummary = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const escapedName = member.fullName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const entryQuery = {
      $or: [
        { memberId: member._id },
        { forFromName: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
      ],
    };

    const entries = await Entry.find(entryQuery).sort({ date: -1, time: -1 });
    const totalAmount = entries.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    res.json({
      success: true,
      data: {
        member: {
          _id: member._id,
          fullName: member.fullName,
          email: member.email,
        },
        hasEntries: entries.length > 0,
        entryCount: entries.length,
        totalAmount: Math.trunc(totalAmount),
        entries: entries.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get summary of multiple members' entries before bulk deletion
// @route   POST /api/members/bulk-entries-summary
const getBulkMembersEntriesSummary = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No member IDs provided' });
    }

    const members = await Member.find({ _id: { $in: ids } });
    const names = members.map((m) => m.fullName);
    const escapedNames = names.map((n) => n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));

    const entryQuery = {
      $or: [
        { memberId: { $in: ids } },
        { forFromName: { $in: names } },
        ...escapedNames.map((n) => ({ forFromName: { $regex: new RegExp(`^${n}$`, 'i') } })),
      ],
    };

    const entries = await Entry.find(entryQuery);
    const totalAmount = entries.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    const memberSummary = members.map((m) => {
      const esc = m.fullName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const reg = new RegExp(`^${esc}$`, 'i');
      const mEntries = entries.filter(
        (e) => String(e.memberId) === String(m._id) || reg.test(e.forFromName)
      );
      return {
        _id: m._id,
        fullName: m.fullName,
        count: mEntries.length,
        totalAmount: Math.trunc(mEntries.reduce((a, c) => a + (c.amount || 0), 0)),
      };
    });

    res.json({
      success: true,
      data: {
        memberCount: members.length,
        hasEntries: entries.length > 0,
        entryCount: entries.length,
        totalAmount: Math.trunc(totalAmount),
        memberSummary,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single member (entries remain intact)
// @route   DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // 1. Never delete the current logged-in Admin account
    const currentProfile = await Profile.findOne();
    if (isMemberCurrentAdmin(member, currentProfile)) {
      return res.status(400).json({
        success: false,
        message: 'The current logged-in Admin account cannot be deleted.',
      });
    }

    // 2. Never delete the only remaining Admin in the system
    if (member.role === 'Admin') {
      const adminCount = await getUniqueAdminCount();
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only Admin in the system. There must always be at least one Admin.',
        });
      }
    }

    await Member.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Member '${member.fullName}' deleted successfully`,
      deletedMemberName: member.fullName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete members (entries remain intact)
// @route   POST /api/members/bulk-delete
const bulkDeleteMembers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No member IDs provided for deletion' });
    }

    const membersToDelete = await Member.find({ _id: { $in: ids } }).lean();

    // 1. Check if trying to delete current logged-in admin
    const currentProfile = await Profile.findOne();
    const containsCurrentAdmin = membersToDelete.some((m) => isMemberCurrentAdmin(m, currentProfile));
    if (containsCurrentAdmin) {
      return res.status(400).json({
        success: false,
        message: 'The current logged-in Admin account cannot be deleted. Please deselect it and try again.',
      });
    }

    // 2. Check if deleting these would remove all admins
    const adminMembersToDelete = membersToDelete.filter((m) => m.role === 'Admin');

    if (adminMembersToDelete.length > 0) {
      const totalAdminCount = await getUniqueAdminCount();
      if (totalAdminCount - adminMembersToDelete.length <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only Admin in the system. There must always be at least one Admin.',
        });
      }
    }

    const result = await Member.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} member(s) deleted successfully`,
      deletedMembersCount: result.deletedCount,
    });
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

    if (!member.email || !member.email.trim()) {
      return res.status(400).json({
        success: false,
        message: `Cannot send invite: ${member.fullName} does not have an E-mail address configured.`,
      });
    }

    const appUrl = getAppUrl(req);
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
    const appUrl = getAppUrl(req);
    const missingEmailMembers = members.filter((m) => !m.email || !m.email.trim()).map((m) => m.fullName);
    const validMembers = members.filter((m) => m.email && m.email.trim());

    if (validMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the selected members have an E-mail address configured.',
        sentCount: 0,
        failedCount: 0,
        missingEmailMembers,
      });
    }

    // Send emails in parallel with concurrency control
    const results = await Promise.allSettled(
      validMembers.map(async (member) => {
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
          return { success: true, email: member.email };
        } else {
          throw new Error(emailResult.error || 'Failed to deliver email');
        }
      })
    );

    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        sentCount++;
      } else {
        failedCount++;
        if (r.reason && r.reason.message && !errors.includes(r.reason.message)) {
          errors.push(r.reason.message);
        }
      }
    });

    const hasMissing = missingEmailMembers.length > 0;
    let message = `Invites sent: ${sentCount}`;
    if (hasMissing) {
      message += `. ${missingEmailMembers.length} member(s) skipped (no email: ${missingEmailMembers.join(', ')})`;
    }
    if (failedCount > 0) {
      message += `. Failed: ${failedCount}`;
      if (errors.length > 0) {
        message += ` — ${errors[0]}`;
      }
    }

    res.json({
      success: sentCount > 0,
      message,
      sentCount,
      failedCount,
      missingEmailMembers,
      errorDetail: errors[0] || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMembers,
  getMemberEntriesSummary,
  getBulkMembersEntriesSummary,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  sendInviteToMember,
  bulkInviteMembers,
};
