const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createSessionSchema,
  updateSessionSchema,
} = require("../validators/sessionValidator");

router.post(
  "/:orgId/sessions",
  authenticate,
  validate(createSessionSchema),
  sessionController.createSession
);
router.get(
  "/:orgId/sessions",
  authenticate,
  sessionController.getOrganizationSessions
);
router.get(
  "/sessions/:sessionId",
  authenticate,
  sessionController.getSessionById
);
router.put(
  "/sessions/:sessionId",
  authenticate,
  validate(updateSessionSchema),
  sessionController.updateSession
);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  sessionController.deleteSession
);
router.post(
  "/sessions/:sessionId/duplicate",
  authenticate,
  sessionController.duplicateSession
);
router.post(
  "/sessions/:sessionId/assign",
  authenticate,
  sessionController.assignUser
);
router.post(
  "/sessions/:sessionId/unassign",
  authenticate,
  sessionController.unassignUser
);

module.exports = router;
