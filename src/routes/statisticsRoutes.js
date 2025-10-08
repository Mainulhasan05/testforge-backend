const express = require("express");
const router = express.Router();
const statisticsController = require("../controllers/statisticsController");
const sessionDuplicationController = require("../controllers/sessionDuplicationController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  duplicateSessionSchema,
  duplicateSessionCustomSchema,
} = require("../validators/statisticsValidator");

router.get(
  "/sessions/:sessionId/statistics",
  authenticate,
  statisticsController.getSessionStatistics
);
router.get(
  "/organizations/:orgId/statistics",
  authenticate,
  statisticsController.getOrganizationStatistics
);

router.post(
  "/sessions/:sessionId/duplicate",
  authenticate,
  validate(duplicateSessionSchema),
  sessionDuplicationController.duplicateSession
);
router.post(
  "/sessions/:sessionId/duplicate-custom",
  authenticate,
  validate(duplicateSessionCustomSchema),
  sessionDuplicationController.duplicateSessionWithCustomization
);
router.get(
  "/sessions/:sessionId/duplicate-preview",
  authenticate,
  sessionDuplicationController.getSessionDuplicatePreview
);

module.exports = router;
