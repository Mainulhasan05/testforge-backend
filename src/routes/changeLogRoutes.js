const express = require("express");
const router = express.Router();
const changeLogController = require("../controllers/changeLogController");
const { authenticate } = require("../middlewares/auth");

// Support both route patterns
router.get(
  "/:entityType/:entityId",
  authenticate,
  changeLogController.getEntityChangeLogs
);

router.get(
  "/entities/:entityType/:entityId/changelog",
  authenticate,
  changeLogController.getEntityChangeLogs
);

module.exports = router;
