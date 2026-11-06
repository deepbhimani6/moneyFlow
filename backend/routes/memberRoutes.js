const express = require('express');
const router = express.Router();
const {
  getMembers,
  getMemberEntriesSummary,
  getBulkMembersEntriesSummary,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  sendInviteToMember,
  bulkInviteMembers,
} = require('../controllers/memberController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getMembers)
  .post(createMember);

router.post('/bulk-delete', bulkDeleteMembers);
router.post('/bulk-invite', bulkInviteMembers);
router.post('/bulk-entries-summary', getBulkMembersEntriesSummary);

router.route('/:id')
  .put(updateMember)
  .delete(deleteMember);

router.get('/:id/entries-summary', getMemberEntriesSummary);
router.post('/:id/invite', sendInviteToMember);

module.exports = router;
