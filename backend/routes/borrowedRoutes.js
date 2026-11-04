const express = require("express");
const router = express.Router();
const {
  getBorrowedEntries,
  createBorrowedEntry,
  updateBorrowedEntry,
  deleteBorrowedEntry,
  bulkUpdateBorrowedStatus,
  bulkDeleteBorrowed,
} = require("../controllers/borrowedController");

router
  .route("/")
  .get(getBorrowedEntries)
  .post(createBorrowedEntry);

router.post("/bulk-status", bulkUpdateBorrowedStatus);
router.post("/bulk-delete", bulkDeleteBorrowed);

router
  .route("/:id")
  .put(updateBorrowedEntry)
  .delete(deleteBorrowedEntry);

module.exports = router;
