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

  async getUserFeedbackForCase(req, res, next) {
    try {
      const { caseId } = req.params;

      const feedback = await feedbackService.getUserFeedbackForCase(
        caseId,
        req.user._id
      );

      sendSuccess(res, feedback);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      next(error);
    }
  }

  async updateFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;

      const feedback = await feedbackService.updateFeedback(
        feedbackId,
        req.user._id,
        req.body
      );

      sendSuccess(res, feedback, "Feedback updated successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("only update your own")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async deleteFeedback(req, res, next) {
    try {
      const { feedbackId } = req.params;

      await feedbackService.deleteFeedback(feedbackId, req.user._id);

      sendSuccess(res, null, "Feedback deleted successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("only delete your own")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }
}

module.exports = new FeedbackController();
