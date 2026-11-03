const express = require('express');
const router = express.Router();
const {
  getEntries,
  getSplitGroupEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  bulkUpdateStatus,
  bulkDeleteEntries,
} = require('../controllers/entryController');

router.route('/')
  .get(getEntries)
  .post(createEntry);

router.get('/split-group/:splitGroupId', getSplitGroupEntries);
router.post('/bulk-status', bulkUpdateStatus);
router.post('/bulk-delete', bulkDeleteEntries);

router.route('/:id')
  .put(updateEntry)
  .delete(deleteEntry);

module.exports = router;
