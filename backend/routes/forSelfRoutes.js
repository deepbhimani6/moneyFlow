const express = require("express");
const router = express.Router();
const {
  getForSelfEntries,
  createForSelfEntry,
  updateForSelfEntry,
  deleteForSelfEntry,
  bulkDeleteForSelf,
  bulkUpdateStatusForSelf,
} = require("../controllers/forSelfController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router
  .route("/")
  .get(getForSelfEntries)
  .post(createForSelfEntry);

router.post("/bulk-delete", bulkDeleteForSelf);
router.post("/bulk-status", bulkUpdateStatusForSelf);

router
  .route("/:id")
  .put(updateForSelfEntry)
  .delete(deleteForSelfEntry);

module.exports = router;
