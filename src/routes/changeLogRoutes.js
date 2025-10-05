const express = require("express");
const router = express.Router();
const changeLogController = require("../controllers/changeLogController");
const { authenticate } = require("../middlewares/auth");

router.get(
  "/entities/:entityType/:entityId/changelog",
  authenticate,
  changeLogController.getEntityChangeLogs
);

module.exports = router;
