const ToPay = require("../models/ToPay");
const Entry = require("../models/Entry");
const ForSelf = require("../models/ForSelf");
const Member = require("../models/Member");
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

// @desc    Get to-pay entries with filtering, search and sorting
// @route   GET /api/to-pay
const getToPayEntries = async (req, res) => {
  try {
    const { status, type, paymentStatus, search, description, names, selectedNames, forFromName, name, personName, startDate, endDate, minAmount, maxAmount } = req.query;
    let query = { userId: req.user._id };
    const andConditions = [];

    const targetType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (targetType && targetType !== 'All') {
      andConditions.push({
        $or: [{ type: targetType }, { status: targetType }]
      });
    }

    const filterStatus = paymentStatus || (["Paid", "Pending"].includes(status) && !["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : null);
    if (filterStatus && filterStatus !== 'All') {
      andConditions.push({
        $or: [{ paymentStatus: filterStatus }, { status: filterStatus }]
      });
    }

    // Filter by member / person name
    const rawNames = forFromName || name || personName || names || selectedNames || req.query['names[]'];
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

    const entries = await ToPay.find(query).sort({ date: -1, time: -1, createdAt: -1 });
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

// @desc    Create new To Pay entry or split entries across members
// @route   POST /api/to-pay
const createToPayEntry = async (req, res) => {
  try {
    const { names, status, type, paymentStatus, amount, date, time, includeMine, description } = req.body;
    const entryType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : "Expense");
    const entryPaymentStatus = paymentStatus || (["Paid", "Pending"].includes(status) ? status : "Pending");

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

      const singleEntry = new ToPay({
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
        message: `You added a ${entryType} (To Pay) entry of ₹${parsedAmount} for ${singleName}.`,
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
    const alreadyHasMine = nameList.some((item) => {
      const name = (typeof item === 'object' ? (item.name || item.fullName) : item).toLowerCase();
      return name.includes('myself') || name.includes('you (myself)');
    });

    const addSeparateMine = Boolean(includeMine) && !alreadyHasMine;
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

    for (const item of nameList) {
      const memberName = typeof item === "object" ? (item.name || item.fullName) : item;
      const isThisMine = memberName.toLowerCase().includes('myself') || memberName.toLowerCase().includes('you (myself)');
      const resolvedMemberId = isThisMine ? null : await resolveOrCreateMember(item, req.user);

      let memberAmount = equalSplitAmount;
      if (isSeparateMode && typeof item === "object" && item.amount !== undefined && item.amount !== null) {
        memberAmount = Math.trunc(Number(item.amount));
      }

      const memberEntry = new ToPay({
        userId: req.user._id,
        forFromName: memberName,
        memberId: resolvedMemberId,
        type: isThisMine ? "Expense" : "Split",
        status: isThisMine ? "Expense" : "Split",
        paymentStatus: entryPaymentStatus,
        amount: memberAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: true,
        splitGroupId,
        originalTotalAmount: totalGroupAmount,
        isMine: isThisMine,
        creatorUserId: req.user._id,
      });

      await memberEntry.save();
      createdEntries.push(memberEntry);

      // Reciprocal entry for selected registered member in their To Receive list:
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

        const recipientEntry = new Entry({
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

        await recipientEntry.save();

        // In-app notification for recipient member
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

    if (addSeparateMine) {
      let myAmount = equalSplitAmount;
      if (isSeparateMode && req.body.myAmount !== undefined && req.body.myAmount !== null) {
        myAmount = Math.trunc(Number(req.body.myAmount));
      }

      const myEntry = new ToPay({
        userId: req.user._id,
        forFromName: "You (Myself)",
        memberId: null,
        type: "Expense",
        status: "Expense",
        paymentStatus: entryPaymentStatus,
        amount: myAmount,
        date: entryDate,
        time: entryTime,
        description: description ? description.trim() : '',
        isSplit: true,
        splitGroupId,
        originalTotalAmount: totalGroupAmount,
        isMine: true,
        creatorUserId: req.user._id,
      });

      await myEntry.save();
      createdEntries.push(myEntry);
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

// @desc    Get all to-pay entries in a split group
// @route   GET /api/to-pay/split-group/:splitGroupId
const getSplitGroupEntries = async (req, res) => {
  try {
    const toPayMembers = await ToPay.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const entryMembers = await Entry.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const forSelfMembers = await ForSelf.find({ splitGroupId: req.params.splitGroupId, userId: req.user._id });
    const entries = [...toPayMembers, ...entryMembers, ...forSelfMembers];
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a to-pay entry (and optionally synchronise its split group)
// @route   PUT /api/to-pay/:id
const updateToPayEntry = async (req, res) => {
  try {
    const { forFromName, type, status, paymentStatus, amount, date, time, description, totalAmount } = req.body;

    const entry = await ToPay.findOne({ _id: req.params.id, userId: req.user._id });
    if (!entry) {
      return res.status(404).json({ success: false, message: "Entry not found." });
    }

    const nextType = type || (["Add Balance", "Expense", "Loan", "Split"].includes(status) ? status : entry.type);
    const nextPaymentStatus = paymentStatus || (["Paid", "Pending"].includes(status) ? status : entry.paymentStatus);

    // IF THIS IS A SPLIT ENTRY:
    // Update all entries in this split group together across all members
    if (entry.isSplit && entry.splitGroupId) {
      const isCreator = !entry.creatorUserId || String(entry.creatorUserId) === String(req.user._id);

      // If not creator, only allow toggling payment status for their own record
      if (!isCreator) {
        if (nextPaymentStatus && !totalAmount && !amount && !date && !time && description === undefined && !forFromName && !type) {
          entry.paymentStatus = nextPaymentStatus;
          entry.status = nextPaymentStatus;
          await entry.save();
          return res.json({ success: true, data: entry, message: "Payment status updated successfully." });
        }
        return res.status(403).json({
          success: false,
          message: "Only the creator of this split can edit this entry.",
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
              await ToPay.findByIdAndUpdate(sp._id, { $set: { amount: itemAmount } });
            }
            // Update reciprocal entry in recipient's Entry
            if (sp.memberId) {
              await Entry.updateMany(
                { splitGroupId: entry.splitGroupId, userId: sp.memberId },
                { $set: { amount: itemAmount } }
              );
            }
          }
        }

        if (nextPaymentStatus) {
          entry.paymentStatus = nextPaymentStatus;
          entry.status = nextPaymentStatus;
          await entry.save();
        }

        const updated = await ToPay.findOne({ _id: req.params.id, userId: req.user._id });
        return res.json({
          success: true,
          message: `Updated split entries with custom member amounts (Total: ₹${newTotal}).`,
          isSplitGroupUpdate: true,
          data: updated,
        });
      }

      // EQUAL SPLIT UPDATE:
      const creatorToPay = await ToPay.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const creatorEntries = await Entry.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const creatorForSelf = await ForSelf.find({ splitGroupId: entry.splitGroupId, userId: req.user._id });
      const groupCount = (creatorToPay.length + creatorEntries.length + creatorForSelf.length) || 1;

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
      if (nextPaymentStatus) {
        entry.paymentStatus = nextPaymentStatus;
        entry.status = nextPaymentStatus;
        await entry.save();
      }

      const updated = await ToPay.findOne({ _id: req.params.id, userId: req.user._id });
      return res.json({
        success: true,
        message: `Updated split entries (₹${perPersonAmount} each).`,
        isSplitGroupUpdate: true,
        data: updated,
      });
    }

    // Standard single entry update
    if (forFromName !== undefined) {
      entry.forFromName = forFromName;
      const isMine = /myself/i.test(forFromName) || /you\s*\(myself\)/i.test(forFromName);
      entry.isMine = isMine;
      entry.memberId = isMine ? null : await resolveOrCreateMember(forFromName, req.user);
    }

    if (nextType) {
      entry.type = nextType;
      entry.status = nextType;
    }

    if (nextPaymentStatus) {
      entry.paymentStatus = nextPaymentStatus;
    }

    if (amount !== undefined) {
      entry.amount = Math.trunc(Number(amount));
    }

    if (date) entry.date = date;
    if (time) entry.time = time;
    if (description !== undefined) entry.description = description ? description.trim() : '';

    await entry.save();

    res.json({
      success: true,
      message: "Entry updated successfully.",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single to-pay entry
// @route   DELETE /api/to-pay/:id
const deleteToPayEntry = async (req, res) => {
  try {
    const entry = await ToPay.findOne({ _id: req.params.id, userId: req.user._id });
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

    await ToPay.findByIdAndDelete(entry._id);
    res.json({
      success: true,
      message: "Entry deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk update status for to-pay entries
// @route   POST /api/to-pay/bulk-status
const bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    await ToPay.updateMany(
      { _id: { $in: ids }, userId: req.user._id },
      { $set: { paymentStatus: status, status: status } }
    );

    res.json({
      success: true,
      message: `Updated status for ${ids.length} entries to ${status}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk delete to-pay entries
// @route   POST /api/to-pay/bulk-delete
const bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No entries selected." });
    }

    const entries = await ToPay.find({ _id: { $in: ids }, userId: req.user._id });
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
      const resToPay = await ToPay.deleteMany({ splitGroupId: { $in: groupIds } });
      await Entry.deleteMany({ splitGroupId: { $in: groupIds } });
      await ForSelf.deleteMany({ splitGroupId: { $in: groupIds } });
      deletedCount += resToPay.deletedCount;
    }

    if (regularIdsToDelete.length > 0) {
      const resRegular = await ToPay.deleteMany({ _id: { $in: regularIdsToDelete } });
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
  getToPayEntries,
  createToPayEntry,
  getSplitGroupEntries,
  updateToPayEntry,
  deleteToPayEntry,
  bulkUpdateStatus,
  bulkDelete,
};
