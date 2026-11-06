const Entry = require("../models/Entry");
const Member = require("../models/Member");
const ForSelf = require("../models/ForSelf");
const ToPay = require("../models/ToPay");
const Notification = require("../models/Notification");
const crypto = require("crypto");
const { capitalizeName } = require("../utils/formatters");
const { sendEntryNotificationEmail } = require("../utils/email");

// Helper to resolve or auto-create a Member when a new participant name is used
const resolveOrCreateMember = async (item, user) => {
  if (!item) return null;
  const rawName = typeof item === "object" ? (item.fullName || item.name || "") : String(item).trim();
  const memberName = capitalizeName(rawName);
  const existingMemberId = typeof item === "object" ? item.memberId || item._id : null;

  if (!memberName || /myself/i.test(memberName) || /you\s*\(myself\)/i.test(memberName)) {
    return null;
  }

  // If already an existing MongoDB ObjectId, check if it exists
  if (existingMemberId && existingMemberId !== "myself") {
    const existing = await Member.findById(existingMemberId).catch(() => null);
    if (existing) {
      if (user && user._id) {
        await Member.findByIdAndUpdate(user._id, { $addToSet: { members: existing._id } });
      }
      return existing._id;
    }
  }

  // Look for existing member within user's contacts or created by this user
  const escaped = memberName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  let member = await Member.findOne({
    fullName: { $regex: new RegExp(`^${escaped}$`, "i") },
    $or: [
      { createdBy: user?._id },
      { _id: { $in: user?.members || [] } },
    ],
  });

  if (!member) {
    member = await Member.create({
      fullName: memberName,
      email: "",
      phoneNumber: "",
      username: memberName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      password: "",
      createdBy: user ? user._id : null,
      joinDate: null,
      hasLoggedIn: false,
      inviteSent: false,
    });
  }

  if (user && user._id) {
    await Member.findByIdAndUpdate(user._id, { $addToSet: { members: member._id } });
  }

  return member._id;
};

// @desc    Get entries with filtering and pagination
// @route   GET /api/entries
const getEntries = async (req, res) => {
  try {
    const { status, type, paymentStatus, search, description, names, selectedNames, startDate, endDate, minAmount, maxAmount } = req.query;
    let query = { userId: req.user._id };
    const andConditions = [];

    const targetType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (targetType && targetType !== 'All') {
      andConditions.push({
        $or: [{ type: targetType }, { status: targetType }]
      });
    }

    const filterStatus = paymentStatus || (["Received", "Pending"].includes(status) && !["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (filterStatus && filterStatus !== 'All') {
      andConditions.push({ paymentStatus: filterStatus });
    }

    // Filter by multiple participant names from Autocomplete
    const rawNames = names || selectedNames || req.query['names[]'];
    let participantList = [];
    if (Array.isArray(rawNames)) {
      participantList = rawNames.filter(Boolean);
    } else if (typeof rawNames === 'string' && rawNames.trim()) {
      participantList = rawNames.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (participantList.length > 0) {
      const nameOrConditions = participantList.map((name) => {
        if (/myself/i.test(name)) {
          return {
            $or: [
              { forFromName: { $regex: /myself/i } },
              { isMine: true },
            ],
          };
        }
        return {
          $or: [
            { forFromName: { $regex: name, $options: 'i' } },
            { description: { $regex: name, $options: 'i' } },
          ],
        };
      });
      andConditions.push({ $or: nameOrConditions });
    }

    // Filter by description
    if (description && description.trim()) {
      andConditions.push({
        description: { $regex: description.trim(), $options: 'i' },
      });
    }

    if (search && search.trim()) {
      andConditions.push({
        $or: [
          { forFromName: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = Number(minAmount);
      if (maxAmount) query.amount.$lte = Number(maxAmount);
    }

    const entries = await Entry.find(query).sort({ date: -1, time: -1, createdAt: -1 });
    const formatted = entries.map((e) => {
      const obj = e.toObject ? e.toObject() : { ...e };
      const isCreator = !obj.isSplit || !obj.creatorUserId || String(obj.creatorUserId) === String(req.user._id);
      return {
        ...obj,
        canEdit: isCreator,
        canDelete: isCreator,
        isCreator,
      };
    });
    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new entry or split entries across members
// @route   POST /api/entries
const createEntry = async (req, res) => {
  try {
    const { names, status, type, paymentStatus, amount, date, time, includeMine, description } = req.body;
    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : "Expense");
    const entryPaymentStatus = paymentStatus || (["Received", "Pending"].includes(status) ? status : "Pending");

    if (!names || (Array.isArray(names) && names.length === 0)) {
      return res.status(400).json({ success: false, message: "Member name is required." });
    }

    const parsedAmount = Math.trunc(Number(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Please enter a valid amount." });
    }

    const entryDate = date || new Date().toISOString().split("T")[0];
    const entryTime = time || new Date().toTimeString().split(" ")[0].substring(0, 5);

    // Normalize names to an array
    const nameList = Array.isArray(names) ? names : [names];

    // Single person entry (not split)
    if (nameList.length === 1 && !includeMine) {
      const singleName = typeof nameList[0] === "object" ? (nameList[0].name || nameList[0].fullName) : nameList[0];
      const resolvedMemberId = await resolveOrCreateMember(nameList[0], req.user);

      const singleEntry = new Entry({
        userId: req.user._id,
        forFromName: singleName,
        memberId: resolvedMemberId,
        type: entryType,
        status: entryType,
        paymentStatus: entryPaymentStatus,
        amount: parsedAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: false,
        creatorUserId: req.user._id,
      });

      await singleEntry.save();

      const creatorName = req.user.fullName || 'You';
      const cleanDescription = description && description.trim() ? description.trim() : 'No description provided';

      // 1. In-app notification for the creator
      await Notification.create({
        userId: req.user._id,
        creatorUserId: req.user._id,
        creatorName,
        title: `Entry Added: ${entryType}`,
        message: `You added a ${entryType} entry of ₹${parsedAmount} for ${singleName}.`,
        entryType,
        amount: parsedAmount,
        reason: cleanDescription,
        date: entryDate,
        time: entryTime,
      }).catch((e) => console.error('[Notification Error]:', e.message));

      // 2. In-app and email notification for the recipient if registered member
      if (resolvedMemberId && String(resolvedMemberId) !== String(req.user._id)) {
        const recipientMember = await Member.findById(resolvedMemberId).catch(() => null);
        if (recipientMember) {
          await Notification.create({
            userId: recipientMember._id,
            creatorUserId: req.user._id,
            creatorName: req.user.fullName || 'A member',
            title: `New ${entryType} Entry`,
            message: `${req.user.fullName || 'A member'} added a ${entryType} entry of ₹${parsedAmount} involving you.`,
            entryType,
            amount: parsedAmount,
            reason: cleanDescription,
            date: entryDate,
            time: entryTime,
          }).catch((e) => console.error('[Notification Error]:', e.message));

          if (recipientMember.email) {
            sendEntryNotificationEmail({
              toEmail: recipientMember.email,
              recipientName: recipientMember.fullName,
              creatorName: req.user.fullName || 'A member',
              entryType,
              amount: parsedAmount,
              reason: cleanDescription,
              date: entryDate,
              time: entryTime,
              isSplit: false,
            }).catch((e) => console.error('[Email Notification Error]:', e.message));
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: "Entry created successfully.",
        data: [singleEntry],
      });
    }

    // MULTI-MEMBER SPLIT LOGIC:
    const addSeparateMine = Boolean(includeMine);
    const totalParticipants = nameList.length + (addSeparateMine ? 1 : 0);
    const splitGroupId = `split_${crypto.randomBytes(6).toString("hex")}`;
    const isSeparateMode = req.body.splitMode === "separate" || nameList.some((item) => typeof item === "object" && item.amount !== undefined && item.amount !== null);

    let totalGroupAmount = parsedAmount;
    if (isSeparateMode) {
      let sum = 0;
      for (const item of nameList) {
        if (typeof item === "object" && item.amount !== undefined && item.amount !== null) {
          sum += Math.trunc(Number(item.amount) || 0);
        }
      }
      if (addSeparateMine && req.body.myAmount !== undefined && req.body.myAmount !== null) {
        sum += Math.trunc(Number(req.body.myAmount) || 0);
      }
      if (sum > 0) {
        totalGroupAmount = sum;
      }
    }

    const equalSplitAmount = Math.trunc(parsedAmount / totalParticipants);
    const createdEntries = [];

    // Create entry for each member in the list
    for (const item of nameList) {
      const memberName = typeof item === "object" ? (item.name || item.fullName) : item;
      const resolvedMemberId = await resolveOrCreateMember(item, req.user);

      let memberAmount = equalSplitAmount;
      if (isSeparateMode && typeof item === "object" && item.amount !== undefined && item.amount !== null) {
        memberAmount = Math.trunc(Number(item.amount));
      }

      const memberEntry = new Entry({
        userId: req.user._id,
        forFromName: memberName,
        memberId: resolvedMemberId,
        type: "Split",
        status: "Split",
        paymentStatus: entryPaymentStatus,
        amount: memberAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: true,
        splitGroupId,
        originalTotalAmount: totalGroupAmount,
        isMine: false,
        creatorUserId: req.user._id,
      });

      await memberEntry.save();
      createdEntries.push(memberEntry);

      // Reciprocal entry for selected registered member in their To Pay list:
      if (resolvedMemberId && String(resolvedMemberId) !== String(req.user._id)) {
        await Member.findByIdAndUpdate(resolvedMemberId, { $addToSet: { members: req.user._id } }).catch(() => null);

        const recipientMember = await Member.findById(resolvedMemberId).catch(() => null);
        let creatorDisplayName = req.user.fullName;
        if (recipientMember && recipientMember.memberCustomNames) {
          const customName = typeof recipientMember.memberCustomNames.get === 'function'
            ? recipientMember.memberCustomNames.get(String(req.user._id))
            : recipientMember.memberCustomNames[String(req.user._id)];
          if (customName) {
            creatorDisplayName = customName;
          }
        }

        const recipientToPay = new ToPay({
          userId: resolvedMemberId,
          forFromName: creatorDisplayName,
          memberId: req.user._id,
          type: "Split",
          status: "Split",
          paymentStatus: "Pending",
          amount: memberAmount,
          date: entryDate,
          time: entryTime,
          description: description ? description.trim() : '',
          isSplit: true,
          splitGroupId,
          originalTotalAmount: totalGroupAmount,
          isMine: false,
          creatorUserId: req.user._id,
        });

        await recipientToPay.save();

        // In-app notification for the recipient member
        await Notification.create({
          userId: recipientMember._id,
          creatorUserId: req.user._id,
          creatorName: req.user.fullName || 'A member',
          title: 'New Split Entry',
          message: `${req.user.fullName || 'A member'} added a Split expense. Your share is ₹${memberAmount}.`,
          entryType: 'Split',
          amount: memberAmount,
          reason: description && description.trim() ? description.trim() : 'Split expense',
          date: entryDate,
          time: entryTime,
          splitGroupId,
        }).catch((e) => console.error('[Notification Error]:', e.message));

        // Email notification to the recipient member
        if (recipientMember.email) {
          sendEntryNotificationEmail({
            toEmail: recipientMember.email,
            recipientName: recipientMember.fullName,
            creatorName: req.user.fullName || 'A member',
            entryType: 'Split Expense',
            amount: memberAmount,
            reason: description && description.trim() ? description.trim() : 'Split expense',
            date: entryDate,
            time: entryTime,
            isSplit: true,
            splitTotalAmount: totalGroupAmount,
            splitParticipantsCount: totalParticipants,
          }).catch((e) => console.error('[Email Notification Error]:', e.message));
        }
      }
    }

    // In-app notification for the creator
    await Notification.create({
      userId: req.user._id,
      creatorUserId: req.user._id,
      creatorName: req.user.fullName || 'You',
      title: 'Split Entry Created',
      message: `You created a Split entry of ₹${totalGroupAmount} across ${totalParticipants} participants.`,
      entryType: 'Split',
      amount: totalGroupAmount,
      reason: description && description.trim() ? description.trim() : 'Split expense',
      date: entryDate,
      time: entryTime,
      splitGroupId,
    }).catch((e) => console.error('[Notification Error]:', e.message));

    // If "Include myself in the split" was checked, automatically create an Expense in ForSelf
    if (addSeparateMine) {
      let myAmount = equalSplitAmount;
      if (isSeparateMode && req.body.myAmount !== undefined && req.body.myAmount !== null) {
        myAmount = Math.trunc(Number(req.body.myAmount));
      }

      await ForSelf.create({
        userId: req.user._id,
        type: "Expense",
        amount: myAmount,
        date: entryDate,
        time: entryTime,
        description: description ? `${description.trim()} (Split share)` : "Split share",
        isSplit: true,
        splitGroupId,
        originalTotalAmount: totalGroupAmount,
        creatorUserId: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: isSeparateMode
        ? `Split across ${createdEntries.length} entries with custom amounts (Total: ₹${totalGroupAmount}).`
        : `Split across ${createdEntries.length} entries (₹${equalSplitAmount} each).`,
      data: createdEntries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all entries in a split group
// @route   GET /api/entries/split-group/:splitGroupId
const getSplitGroupEntries = async (req, res) => {
  try {
    const entryMembers = await Entry.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const toPayMembers = await ToPay.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const forSelfMembers = await ForSelf.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const allMembers = [...entryMembers, ...toPayMembers, ...forSelfMembers];
    res.json({ success: true, count: allMembers.length, data: allMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update single entry or split group entries
// @route   PUT /api/entries/:id
const updateEntry = async (req, res) => {
  try {
    const { forFromName, status, type, paymentStatus, amount, totalAmount, date, time, description } = req.body;
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id });

    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found." });
    }

    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : undefined);
    const entryPaymentStatus = paymentStatus || (["Received", "Pending"].includes(status) ? status : undefined);

    // IF THIS IS A SPLIT ENTRY:
    // Update all entries in this split group together across all members
    if (entry.isSplit && entry.splitGroupId) {
      const isCreator = !entry.creatorUserId || String(entry.creatorUserId) === String(req.user._id);

      // If not creator, cannot edit or change status
      if (!isCreator) {
        return res.status(403).json({
          success: false,
          message: "Only the creator of this split can change the status or edit this entry.",
        });
      }

      // Check if separate/custom shares update is requested
      const { splits } = req.body;
      if (splits && Array.isArray(splits) && splits.length > 0) {
        let newTotal = 0;
        for (const sp of splits) {
          newTotal += Math.trunc(Number(sp.amount) || 0);
        }

        const commonUpdate = {
          originalTotalAmount: newTotal,
        };
        if (date) commonUpdate.date = date;
        if (time) commonUpdate.time = time;
        if (description !== undefined) commonUpdate.description = description ? description.trim() : '';

        // Update common fields across all linked entries
        await Entry.updateMany({ splitGroupId: entry.splitGroupId }, { $set: commonUpdate });
        await ToPay.updateMany({ splitGroupId: entry.splitGroupId }, { $set: commonUpdate });
        await ForSelf.updateMany({ splitGroupId: entry.splitGroupId }, { $set: commonUpdate });

        // Update each member's specific share:
        for (const sp of splits) {
          const itemAmount = Math.trunc(Number(sp.amount) || 0);
          if (sp.isMine) {
            await ForSelf.updateMany(
              { splitGroupId: entry.splitGroupId, userId: req.user._id },
              { $set: { amount: itemAmount } }
            );
          } else {
            // Update creator's entry
            if (sp._id) {
              await Entry.findByIdAndUpdate(sp._id, { $set: { amount: itemAmount } });
            }
            // Update reciprocal entry in recipient's ToPay
            if (sp.memberId) {
              await ToPay.updateMany(
                { splitGroupId: entry.splitGroupId, userId: sp.memberId },
                { $set: { amount: itemAmount } }
              );
            }
          }
        }

        if (entryPaymentStatus) {
          entry.paymentStatus = entryPaymentStatus;
          await entry.save();
        }

        const updatedEntries = await Entry.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
        return res.json({
          success: true,
          message: `Updated split entries with custom member amounts (Total: ₹${newTotal}).`,
          isSplitGroupUpdate: true,
          data: updatedEntries,
        });
      }

      // EQUAL SPLIT UPDATE:
      // Count participants across Entry, ToPay, and ForSelf for this creator
      const creatorEntries = await Entry.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const creatorToPay = await ToPay.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const creatorForSelf = await ForSelf.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const groupCount = (creatorEntries.length + creatorToPay.length + creatorForSelf.length) || 1;

      let perPersonAmount = entry.amount;
      let calculatedTotal = entry.originalTotalAmount || (entry.amount * groupCount);

      if (totalAmount !== undefined && totalAmount !== null && Number(totalAmount) > 0) {
        calculatedTotal = Math.trunc(Number(totalAmount));
        perPersonAmount = Math.trunc(calculatedTotal / groupCount);
      } else if (amount !== undefined && Number(amount) > 0) {
        perPersonAmount = Math.trunc(Number(amount));
        calculatedTotal = perPersonAmount * groupCount;
      }

      const updateData = {
        amount: perPersonAmount,
        originalTotalAmount: calculatedTotal,
      };

      if (date) updateData.date = date;
      if (time) updateData.time = time;
      if (description !== undefined) updateData.description = description ? description.trim() : '';

      // Update group fields across all split members in Entry, ToPay, and ForSelf
      await Entry.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });
      await ToPay.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });
      await ForSelf.updateMany({ splitGroupId: entry.splitGroupId }, { $set: updateData });

      // Only update paymentStatus for this specific entry
      if (entryPaymentStatus) {
        entry.paymentStatus = entryPaymentStatus;
        await entry.save();
      }

      const updatedEntries = await Entry.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });

      return res.json({
        success: true,
        message: `Updated split entries (₹${perPersonAmount} each).`,
        isSplitGroupUpdate: true,
        data: updatedEntries,
      });
    }

    // NON-SPLIT (SINGLE) ENTRY:
    if (forFromName) {
      entry.forFromName = forFromName;
      const isMine = /myself/i.test(forFromName) || /you\s*\(myself\)/i.test(forFromName);
      if (!isMine) {
        const resolvedId = await resolveOrCreateMember(forFromName, req.user);
        if (resolvedId) entry.memberId = resolvedId;
      } else {
        entry.memberId = null;
      }
    }
    if (entryType) {
      entry.type = entryType;
      entry.status = entryType;
    }
    if (entryPaymentStatus) {
      entry.paymentStatus = entryPaymentStatus;
    }
    if (amount !== undefined) entry.amount = Math.trunc(Number(amount));
    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : '';

    await entry.save();
    res.json({ success: true, data: entry, message: "Entry updated successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single entry
// @route   DELETE /api/entries/:id
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, userId: req.user._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found." });
    }

    if (entry.isSplit && entry.splitGroupId) {
      const isCreator = !entry.creatorUserId || String(entry.creatorUserId) === String(req.user._id);
      if (!isCreator) {
        return res.status(403).json({
          success: false,
          message: "Only the creator of this split can delete this entry.",
        });
      }

      // Cascade delete across all selected members in Entry, ToPay, and ForSelf
      await Entry.deleteMany({ splitGroupId: entry.splitGroupId });
      await ToPay.deleteMany({ splitGroupId: entry.splitGroupId });
      await ForSelf.deleteMany({ splitGroupId: entry.splitGroupId });

      return res.json({ success: true, message: "Split entry deleted across all members successfully." });
    }

    await Entry.findByIdAndDelete(entry._id);
    res.json({ success: true, message: "Entry deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update status or type for entries
// @route   POST /api/entries/bulk-status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status, type, paymentStatus, isTypeUpdate } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    let updateData = {};
    if (isTypeUpdate && (type || status)) {
      const targetType = type || status;
      updateData = { type: targetType, status: targetType };
    } else if (paymentStatus || (["Received", "Pending"].includes(status) && !isTypeUpdate)) {
      const targetStatus = paymentStatus || status;
      updateData = { paymentStatus: targetStatus };
    } else if (type || ["Add Balance", "Expense", "Loan", "Split"].includes(status)) {
      const targetType = type || status;
      updateData = { type: targetType, status: targetType };
    } else {
      return res.status(400).json({ success: false, message: "Valid status or type is required." });
    }

    const result = await Entry.updateMany(
      {
        _id: { $in: ids },
        userId: req.user._id,
        $or: [
          { isSplit: false },
          { isSplit: { $exists: false } },
          { isSplit: null },
          { creatorUserId: req.user._id },
        ],
      },
      { $set: updateData }
    );
    res.json({
      success: true,
      message: `${result.modifiedCount} entries updated.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete entries
// @route   POST /api/entries/bulk-delete
const bulkDeleteEntries = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    const entries = await Entry.find({ _id: { $in: ids }, userId: req.user._id });
    const splitGroupIdsToDelete = new Set();
    const regularIdsToDelete = [];

    for (const item of entries) {
      if (item.isSplit && item.splitGroupId) {
        const isCreator = !item.creatorUserId || String(item.creatorUserId) === String(req.user._id);
        if (isCreator) {
          splitGroupIdsToDelete.add(item.splitGroupId);
        }
      } else {
        regularIdsToDelete.push(item._id);
      }
    }

    let deletedCount = 0;
    if (splitGroupIdsToDelete.size > 0) {
      const groupIds = Array.from(splitGroupIdsToDelete);
      const resEntry = await Entry.deleteMany({ splitGroupId: { $in: groupIds } });
      await ToPay.deleteMany({ splitGroupId: { $in: groupIds } });
      await ForSelf.deleteMany({ splitGroupId: { $in: groupIds } });
      deletedCount += resEntry.deletedCount;
    }

    if (regularIdsToDelete.length > 0) {
      const resRegular = await Entry.deleteMany({ _id: { $in: regularIdsToDelete } });
      deletedCount += resRegular.deletedCount;
    }

    res.json({
      success: true,
      message: `${deletedCount} entries deleted successfully.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEntries,
  getSplitGroupEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkUpdateStatus,
  bulkDeleteEntries,
};
