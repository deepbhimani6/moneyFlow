const Member = require('../models/Member');
const Entry = require('../models/Entry');
const { sendInviteEmail } = require('../utils/email');
const { capitalizeName } = require('../utils/formatters');

// Generate random password meeting validation requirements:
// At least 8 chars, uppercase, lowercase, number, symbol
const generateSecurePassword = () => {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const all = uppers + lowers + numbers + symbols;

  let pwd = '';
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 0; i < 6; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

const getAppUrl = (req) => {
  const origin = req ? (typeof req.get === 'function' ? req.get('origin') : (req.headers && req.headers.origin)) : null;
  if (origin) {
    return origin.replace(/\/+$/, '');
  }
  if (
    process.env.APP_URL &&
    !process.env.APP_URL.includes('moneyflow.onrender.com') &&
    !process.env.APP_URL.includes('localhost')
  ) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  return process.env.APP_URL || 'https://moneyflow-5a2a.onrender.com';
};

// @desc    Get all members for the authenticated user
// @route   GET /api/members
const getMembers = async (req, res) => {
  try {
    const { search } = req.query;
    const currentUserId = req.user ? req.user._id : null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const currentUser = await Member.findById(currentUserId);
    // If invited by another user and not yet linked, automatically add inviter to members list
    if (currentUser && currentUser.invitedBy && !currentUser.inviterLinked) {
      if (!currentUser.members) currentUser.members = [];
      const hasInviter = currentUser.members.some((mId) => String(mId) === String(currentUser.invitedBy));
      if (!hasInviter) {
        currentUser.members.push(currentUser.invitedBy);
      }
      currentUser.inviterLinked = true;
      await currentUser.save();
    }

    const memberIds = (currentUser && Array.isArray(currentUser.members)) ? currentUser.members : [];

    // Only return members currently active in the user's directory
    const andConditions = [
      { _id: { $ne: currentUserId } },
      { _id: { $in: memberIds } },
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

    const members = await Member.find({ $and: andConditions }).sort({ createdAt: -1 });
    const customNames = currentUser && currentUser.memberCustomNames ? currentUser.memberCustomNames : null;
    const inviteDates = currentUser && currentUser.memberInviteDates ? currentUser.memberInviteDates : null;
    const currentUserIdStr = currentUserId.toString();

    const formattedMembers = members.map((m) => {
      const mObj = m.toObject ? m.toObject() : { ...m };
      const mIdStr = m._id.toString();

      // 1. Name preservation: caller's custom member name ("without only name")
      let customName = null;
      if (customNames) {
        customName = typeof customNames.get === 'function'
          ? customNames.get(mIdStr)
          : customNames[mIdStr];
      }
      if (customName) {
        mObj.fullName = capitalizeName(customName);
      } else {
        mObj.fullName = capitalizeName(mObj.fullName);
      }

      // 2. Invite Sent Date: only show if the CURRENT USER actually invited this member
      let callerInviteDate = null;
      if (inviteDates) {
        callerInviteDate = typeof inviteDates.get === 'function'
          ? inviteDates.get(mIdStr)
          : inviteDates[mIdStr];
      }

      const wasInvitedByCaller = Boolean(m.invitedBy && m.invitedBy.toString() === currentUserIdStr);

      if (callerInviteDate) {
        mObj.lastInviteSentAt = callerInviteDate;
        mObj.inviteSent = true;
      } else if (wasInvitedByCaller && m.lastInviteSentAt) {
        mObj.lastInviteSentAt = m.lastInviteSentAt;
        mObj.inviteSent = Boolean(m.inviteSent);
      } else {
        // Current user did NOT send an invite to this member -> do not show invite sent date
        mObj.lastInviteSentAt = null;
        mObj.inviteSent = false;
      }

      return mObj;
    });

    res.json({ success: true, count: formattedMembers.length, data: formattedMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new member & optionally send invite link
// @route   POST /api/members
const createMember = async (req, res) => {
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

    // Prevent inviting own logged-in email
    if (req.user && req.user.email && req.user.email.toLowerCase().trim() === cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'You cannot invite your own email address.',
      });
    }

    // Check if member already exists in the system
    const existingMember = await Member.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existingMember) {
      // 1. Is this member already in the current user's members directory?
      const currentUser = await Member.findById(req.user._id);
      const isAlreadyInDirectory = currentUser && currentUser.members && currentUser.members.some(
        (mId) => String(mId) === String(existingMember._id)
      );

      if (isAlreadyInDirectory) {
        return res.status(400).json({
          success: false,
          message: 'This member is already in your members list.',
        });
      }

      // 2. Member already exists in app -> directly add to current user's members directory
      const mIdStr = existingMember._id.toString();
      if (!currentUser.members) currentUser.members = [];
      if (!currentUser.memberCustomNames) currentUser.memberCustomNames = new Map();
      if (!currentUser.members.some((id) => String(id) === mIdStr)) {
        currentUser.members.push(existingMember._id);
      }
      currentUser.memberCustomNames.set(mIdStr, formattedFullName);
      await currentUser.save();

      // Reciprocal link so both members can see and split with each other
      await Member.findByIdAndUpdate(existingMember._id, {
        $addToSet: { members: req.user._id },
      });

      // If existing member had no phone number and one was provided, populate it
      if (!existingMember.phoneNumber && phoneNumber && phoneNumber.trim()) {
        existingMember.phoneNumber = phoneNumber.trim();
        await existingMember.save();
      }

      return res.status(200).json({
        success: true,
        data: existingMember,
        alreadyRegistered: true,
        message: `Member '${existingMember.fullName}' is already registered and was added to your list.`,
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

    // Generate random secure password satisfying password requirements (length >= 8, mixed characters)
    const temporaryPassword = (password && password.trim().length >= 6)
      ? password.trim()
      : generateSecurePassword();

    const member = new Member({
      fullName: capitalizeName(fullName),
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      email: cleanEmail,
      username: cleanUsername,
      password: temporaryPassword, // pre-save hook in Member will hash it with bcrypt
      invitedBy: req.user ? req.user._id : null,
      createdBy: req.user ? req.user._id : null,
      joinDate: null,
      hasLoggedIn: false,
    });

    // Check if invite link checkbox was checked
    if (sendLink) {
      const appUrl = getAppUrl(req);
      const inviteLink = `${appUrl}/login?invited=true&email=${encodeURIComponent(cleanEmail)}`;
      const emailResult = await sendInviteEmail({
        toEmail: member.email,
        fullName: member.fullName,
        username: member.username,
        temporaryPassword: temporaryPassword,
        inviteLink,
      });

      if (emailResult.success) {
        member.inviteSent = true;
        member.lastInviteSentAt = new Date();
      }
    } else {
      member.inviteSent = false;
      member.lastInviteSentAt = null;
    }

    await member.save();

    // Automatically add newly created/invited member to current user's members directory
    if (req.user && req.user._id) {
      const currentUser = await Member.findById(req.user._id);
      if (currentUser) {
        if (!currentUser.members) currentUser.members = [];
        if (!currentUser.memberCustomNames) currentUser.memberCustomNames = new Map();
        if (!currentUser.memberInviteDates) currentUser.memberInviteDates = new Map();
        const newIdStr = member._id.toString();
        if (!currentUser.members.some((id) => String(id) === newIdStr)) {
          currentUser.members.push(member._id);
        }
        currentUser.memberCustomNames.set(newIdStr, formattedFullName);
        if (sendLink && member.lastInviteSentAt) {
          currentUser.memberInviteDates.set(newIdStr, member.lastInviteSentAt);
        }
        await currentUser.save();
      }
    }

    res.status(201).json({
      success: true,
      data: member,
      message: 'Member created successfully.',
      temporaryPassword,
    });
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
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Members who have already joined the app cannot be edited by other members
    if (member.hasLoggedIn || member.joinDate) {
      return res.status(400).json({
        success: false,
        message: 'This member has already joined the app and cannot be edited.',
      });
    }

    if (fullName !== undefined) {
      member.fullName = capitalizeName(fullName);
      const currentUser = await Member.findById(req.user._id);
      if (currentUser) {
        if (!currentUser.memberCustomNames) currentUser.memberCustomNames = new Map();
        currentUser.memberCustomNames.set(member._id.toString(), capitalizeName(fullName));
        await currentUser.save();
      }
    }
    if (phoneNumber !== undefined) member.phoneNumber = phoneNumber ? phoneNumber.trim() : '';
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail && cleanEmail !== (member.email || '').toLowerCase()) {
        const existingEmail = await Member.findOne({
          email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: member._id },
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: 'This email address already exists.',
          });
        }
        member.email = cleanEmail;
      }
    }
    if (username !== undefined) member.username = username ? username.trim() : '';
    if (password !== undefined && password !== '') member.password = password;

    await member.save();
    res.json({ success: true, data: member, message: 'Member updated successfully.' });
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
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const escapedName = member.fullName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const entryQuery = {
      userId: req.user._id,
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
      return res.status(400).json({ success: false, message: 'No members selected.' });
    }

    const members = await Member.find({ _id: { $in: ids } });
    const names = members.map((m) => m.fullName);
    const escapedNames = names.map((n) => n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));

    const entryQuery = {
      userId: req.user._id,
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
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // 1. Never delete the current logged-in account
    const currentUserId = req.user ? String(req.user._id) : null;
    const currentUserEmail = req.user && req.user.email ? req.user.email.toLowerCase().trim() : null;

    const isCurrentLoggedIn =
      (currentUserId && String(member._id) === currentUserId) ||
      (currentUserEmail && member.email && member.email.toLowerCase().trim() === currentUserEmail);

    if (isCurrentLoggedIn) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your logged-in account.',
      });
    }

    const isAdmin = Boolean(
      (req.user && req.user.email && req.user.email.toLowerCase().trim() === 'deepbhimani6@gmail.com') ||
      (req.user && req.user.role === 'Admin')
    );
    const hasLoggedInAtLeastOnce = Boolean(member.hasLoggedIn || member.joinDate);

    // Only remove from this specific user's members directory (does not delete full user account)
    await Member.findByIdAndUpdate(req.user._id, {
      $pull: { members: member._id },
    });

    res.json({
      success: true,
      message: `Member '${member.fullName}' deleted.`,
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
      return res.status(400).json({ success: false, message: 'No members selected.' });
    }

    const currentUserId = req.user ? String(req.user._id) : null;
    const validIds = ids.filter((id) => String(id) !== currentUserId);

    const isAdmin = Boolean(
      (req.user && req.user.email && req.user.email.toLowerCase().trim() === 'deepbhimani6@gmail.com') ||
      (req.user && req.user.role === 'Admin')
    );

    // Only remove from this specific user's members list (does not delete full user account)
    await Member.findByIdAndUpdate(req.user._id, {
      $pull: { members: { $in: validIds } },
    });

    res.json({
      success: true,
      message: `${validIds.length} member(s) deleted.`,
      deletedMembersCount: validIds.length,
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
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    if (!member.email || !member.email.trim()) {
      return res.status(400).json({
        success: false,
        message: `${member.fullName} does not have an email address.`,
      });
    }

    // Do not send invite if member has already joined the app
    if (member.hasLoggedIn || member.joinDate) {
      return res.status(400).json({
        success: false,
        message: `${member.fullName} has already joined the app.`,
      });
    }

    const appUrl = getAppUrl(req);
    const inviteLink = `${appUrl}/login?invited=true&email=${encodeURIComponent(member.email)}`;
    let temporaryPassword = member.password;
    if (!temporaryPassword || temporaryPassword.startsWith('$2a$') || temporaryPassword.startsWith('$2b$')) {
      temporaryPassword = generateSecurePassword();
      member.password = temporaryPassword; // will be hashed by pre-save hook
    }

    const emailResult = await sendInviteEmail({
      toEmail: member.email,
      fullName: member.fullName,
      username: member.username,
      temporaryPassword,
      inviteLink,
    });

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: `Email failed: ${emailResult.error}` });
    }

    const inviteDate = new Date();
    member.inviteSent = true;
    member.lastInviteSentAt = inviteDate;
    member.invitedBy = req.user._id;
    await member.save();

    const currentUser = await Member.findById(req.user._id);
    if (currentUser) {
      if (!currentUser.memberInviteDates) currentUser.memberInviteDates = new Map();
      currentUser.memberInviteDates.set(member._id.toString(), inviteDate);
      await currentUser.save();
    }

    res.json({ success: true, message: `Invite sent to ${member.email}.` });
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
      return res.status(400).json({ success: false, message: 'No members selected.' });
    }

    const members = await Member.find({ _id: { $in: ids } });
    const appUrl = getAppUrl(req);
    const missingEmailMembers = members.filter((m) => !m.email || !m.email.trim()).map((m) => m.fullName);
    const alreadyJoinedMembers = members.filter((m) => m.hasLoggedIn || m.joinDate).map((m) => m.fullName);
    const validMembers = members.filter((m) => m.email && m.email.trim() && !m.hasLoggedIn && !m.joinDate);

    if (validMembers.length === 0) {
      if (alreadyJoinedMembers.length > 0 && missingEmailMembers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Selected member(s) have already joined the app.',
          sentCount: 0,
          failedCount: 0,
          alreadyJoinedMembers,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Selected members do not have an email address or have already joined.',
        sentCount: 0,
        failedCount: 0,
        missingEmailMembers,
        alreadyJoinedMembers,
      });
    }

    // Send emails in parallel with concurrency control
    const inviteDate = new Date();
    const currentUser = await Member.findById(req.user._id);
    if (currentUser && !currentUser.memberInviteDates) {
      currentUser.memberInviteDates = new Map();
    }

    const results = await Promise.allSettled(
      validMembers.map(async (member) => {
        let temporaryPassword = member.password;
        if (!temporaryPassword || temporaryPassword.startsWith('$2a$') || temporaryPassword.startsWith('$2b$')) {
          temporaryPassword = generateSecurePassword();
          member.password = temporaryPassword;
        }

        const inviteLink = `${appUrl}/login?invited=true&email=${encodeURIComponent(member.email)}`;
        const emailResult = await sendInviteEmail({
          toEmail: member.email,
          fullName: member.fullName,
          username: member.username,
          temporaryPassword,
          inviteLink,
        });

        if (emailResult.success) {
          member.invitedBy = req.user._id;
          member.inviteSent = true;
          member.lastInviteSentAt = inviteDate;
          await member.save();
          if (currentUser) {
            currentUser.memberInviteDates.set(member._id.toString(), inviteDate);
          }
          return { success: true, email: member.email };
        } else {
          throw new Error(emailResult.error || 'Failed to deliver email');
        }
      })
    );

    if (currentUser) {
      await currentUser.save();
    }

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

// @desc    Check if an email already belongs to a registered member
// @route   GET /api/members/check-email
const checkMemberEmail = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || !email.trim()) {
      return res.json({ success: true, exists: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentUserId = req.user ? req.user._id : null;

    if (req.user && req.user.email && req.user.email.toLowerCase().trim() === cleanEmail) {
      return res.json({
        success: true,
        exists: true,
        isOwnEmail: true,
        message: 'You cannot add your own email address.',
      });
    }

    const existingMember = await Member.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (!existingMember) {
      return res.json({ success: true, exists: false });
    }

    let isAlreadyInDirectory = false;
    if (currentUserId) {
      const currentUser = await Member.findById(currentUserId);
      if (currentUser && currentUser.members) {
        isAlreadyInDirectory = currentUser.members.some(
          (mId) => String(mId) === String(existingMember._id)
        );
      }
    }

    return res.json({
      success: true,
      exists: true,
      isAlreadyInDirectory,
      member: {
        _id: existingMember._id,
        fullName: existingMember.fullName,
        phoneNumber: existingMember.phoneNumber || '',
        username: existingMember.username || '',
        email: existingMember.email,
        hasLoggedIn: Boolean(existingMember.hasLoggedIn || existingMember.joinDate),
      },
      message: isAlreadyInDirectory
        ? 'This member is already in your members list.'
        : 'This member is already registered on MoneyFlow.',
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
  checkMemberEmail,
};
