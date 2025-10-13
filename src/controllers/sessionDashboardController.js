const sessionDashboardService = require("../services/sessionDashboardService");
const { sendSuccess, sendError } = require("../utils/response");

class SessionDashboardController {
  async getSessionDashboard(req, res, next) {
    try {
      const { sessionId } = req.params;

      const dashboard = await sessionDashboardService.getSessionDashboard(
        sessionId,
        req.user._id
      );

      sendSuccess(res, dashboard, "Session dashboard loaded successfully");
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

  async getTesterProgress(req, res, next) {
    try {
      const { sessionId } = req.params;

      const progress = await sessionDashboardService.getTesterProgress(
        sessionId,
        req.user._id
      );

      sendSuccess(res, progress);
    } catch (error) {
      next(error);
    }
  }

  async getAllTestersProgress(req, res, next) {
    try {
      const { sessionId } = req.params;

      const allProgress = await sessionDashboardService.getAllTestersProgress(
        sessionId,
        req.user._id
      );

      sendSuccess(res, allProgress);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getFeatureStatistics(req, res, next) {
    try {
      const { sessionId } = req.params;

      const statistics = await sessionDashboardService.getFeatureStatistics(
        sessionId,
        req.user._id
      );

      sendSuccess(res, statistics);
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

module.exports = new SessionDashboardController();
