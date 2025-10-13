const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { createFeedbackSchema } = require("../validators/feedbackValidator");

// Routes for case-specific feedback (mounted at /cases)
router.post(
  "/:caseId/feedback",
  authenticate,
  validate(createFeedbackSchema),
  feedbackController.createFeedback
);
router.get(
  "/:caseId/feedback",
  authenticate,
  feedbackController.getCaseFeedback
);
router.get(
  "/:caseId/feedback/my",
  authenticate,
  feedbackController.getUserFeedbackForCase
);

// Routes for individual feedback operations (mounted at /feedback)
router.get(
  "/:feedbackId",
  authenticate,
  feedbackController.getFeedbackById
);
router.put(
  "/:feedbackId",
  authenticate,
  validate(createFeedbackSchema),
  feedbackController.updateFeedback
);
router.delete(
  "/:feedbackId",
  authenticate,
  feedbackController.deleteFeedback
);

module.exports = router;
