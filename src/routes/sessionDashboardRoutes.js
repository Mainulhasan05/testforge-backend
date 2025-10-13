const express = require("express");
const router = express.Router();
const sessionDashboardController = require("../controllers/sessionDashboardController");
const { authenticate } = require("../middlewares/auth");

// Get complete session dashboard (features + cases + user feedback)
router.get(
  "/:sessionId/dashboard",
  authenticate,
  sessionDashboardController.getSessionDashboard
);

// Get tester's progress for a session
router.get(
  "/:sessionId/progress",
  authenticate,
  sessionDashboardController.getTesterProgress
);

// Get all testers' progress (admin only)
router.get(
  "/:sessionId/progress/all",
  authenticate,
  sessionDashboardController.getAllTestersProgress
);

// Get feature-wise statistics with tester information
router.get(
  "/:sessionId/feature-statistics",
  authenticate,
  sessionDashboardController.getFeatureStatistics
);

module.exports = router;
