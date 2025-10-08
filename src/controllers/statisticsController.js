const statisticsService = require("../services/statisticsService");
const { sendSuccess, sendError } = require("../utils/response");

class StatisticsController {
  async getSessionStatistics(req, res, next) {
    try {
      const { sessionId } = req.params;

      const statistics = await statisticsService.getSessionStatistics(
        sessionId,
        req.user._id
      );

      sendSuccess(res, statistics, "Session statistics retrieved successfully");
    } catch (error) {
      if (error.message === "Session not found") {
        return sendError(res, error.message, "SESSION_NOT_FOUND", {}, 404);
      }
      if (error.message === "Access denied") {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getOrganizationStatistics(req, res, next) {
    try {
      const { orgId } = req.params;

      const statistics = await statisticsService.getOrganizationStatistics(
        orgId,
        req.user._id
      );

      sendSuccess(
        res,
        statistics,
        "Organization statistics retrieved successfully"
      );
    } catch (error) {
      if (error.message === "Access denied") {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }
}

module.exports = new StatisticsController();
