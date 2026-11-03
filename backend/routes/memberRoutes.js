const express = require('express');
const router = express.Router();
const {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  bulkDeleteMembers,
  sendInviteToMember,
  bulkInviteMembers,
} = require('../controllers/memberController');

router.route('/')
  .get(getMembers)
  .post(createMember);

router.post('/bulk-delete', bulkDeleteMembers);
router.post('/bulk-invite', bulkInviteMembers);

router.route('/:id')
  .put(updateMember)
  .delete(deleteMember);

router.post('/:id/invite', sendInviteToMember);

module.exports = router;
