const feedbackService = require("../services/feedbackService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class FeedbackController {
  async createFeedback(req, res, next) {
    try {
      const { caseId } = req.params;

      const feedback = await feedbackService.createFeedback(
        caseId,
        req.user._id,
        req.body
      );

      sendSuccess(res, feedback, "Feedback created successfully", null, 201);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only assigned")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getCaseFeedback(req, res, next) {
    try {
      const { caseId } = req.params;
      const { page, limit } = getPaginationParams(req.query);

      const { feedback, total } = await feedbackService.getCaseFeedback(
        caseId,
        req.user._id,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, feedback, null, meta);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message === "Access denied") {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getFeedbackById(req, res, next) {
    try {
      const { feedbackId } = req.params;

      const feedback = await feedbackService.getFeedbackById(
        feedbackId,
        req.user._id
      );

      sendSuccess(res, feedback);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message === "Access denied") {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }
}

module.exports = new FeedbackController();
