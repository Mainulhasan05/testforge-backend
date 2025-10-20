const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createSessionSchema,
  updateSessionSchema,
} = require("../validators/sessionValidator");

// Organization-scoped routes (mounted at /orgs)
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

// Direct session routes (mounted at /sessions)
// Note: Dashboard routes are handled by sessionDashboardRoutes.js
router.get(
  "/:sessionId/progress",
  authenticate,
  sessionController.getProgress
);
router.get(
  "/:sessionId/progress/all",
  authenticate,
  sessionController.getAllProgress
);
router.get(
  "/:sessionId",
  authenticate,
  sessionController.getSessionById
);
router.put(
  "/:sessionId",
  authenticate,
  validate(updateSessionSchema),
  sessionController.updateSession
);
router.delete(
  "/:sessionId",
  authenticate,
  sessionController.deleteSession
);
router.post(
  "/:sessionId/duplicate",
  authenticate,
  sessionController.duplicateSession
);
router.post("/:sessionId/assign", authenticate, sessionController.assignUser);
router.post(
  "/:sessionId/unassign",
  authenticate,
  sessionController.unassignUser
);

module.exports = router;
