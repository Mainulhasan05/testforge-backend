const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const { createFeedbackSchema } = require("../validators/feedbackValidator");

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
  "/feedback/:feedbackId",
  authenticate,
  feedbackController.getFeedbackById
);

module.exports = router;
