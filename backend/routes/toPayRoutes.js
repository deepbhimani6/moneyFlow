const express = require("express");
const router = express.Router();
const {
  getToPayEntries,
  createToPayEntry,
  getSplitGroupEntries,
  updateToPayEntry,
  deleteToPayEntry,
  bulkUpdateStatus,
  bulkDelete,
} = require("../controllers/toPayController");

router
  .route("/")
  .get(getToPayEntries)
  .post(createToPayEntry);

router.get("/split-group/:splitGroupId", getSplitGroupEntries);
router.post("/bulk-status", bulkUpdateStatus);
router.post("/bulk-delete", bulkDelete);

router
  .route("/:id")
  .put(updateToPayEntry)
  .delete(deleteToPayEntry);

module.exports = router;
