const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  sendInviteToUser,
  bulkInviteUsers,
  getUserEntriesSummary,
  getBulkUsersEntriesSummary,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All user management routes require valid authentication and Admin privilege
router.use(protect, adminOnly);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.post('/bulk-delete', bulkDeleteUsers);
router.post('/bulk-invite', bulkInviteUsers);
router.post('/bulk-entries-summary', getBulkUsersEntriesSummary);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

router.get('/:id/entries-summary', getUserEntriesSummary);
router.post('/:id/invite', sendInviteToUser);

module.exports = router;
