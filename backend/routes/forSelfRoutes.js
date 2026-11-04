const express = require("express");
const router = express.Router();
const {
  getForSelfEntries,
  createForSelfEntry,
  updateForSelfEntry,
  deleteForSelfEntry,
  bulkDeleteForSelf,
} = require("../controllers/forSelfController");

router
  .route("/")
  .get(getForSelfEntries)
  .post(createForSelfEntry);

router.post("/bulk-delete", bulkDeleteForSelf);

router
  .route("/:id")
  .put(updateForSelfEntry)
  .delete(deleteForSelfEntry);

module.exports = router;
