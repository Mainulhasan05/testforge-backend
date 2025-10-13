const sessionService = require("../services/sessionService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class SessionController {
  async createSession(req, res, next) {
    try {
      const { orgId } = req.params;

      const session = await sessionService.createSession(
        orgId,
        req.user._id,
        req.body
      );

      sendSuccess(res, session, "Session created successfully", null, 201);
    } catch (error) {
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getOrganizationSessions(req, res, next) {
    try {
      const { orgId } = req.params;
      const { page, limit } = getPaginationParams(req.query);
      const filters = {
        status: req.query.status || "active",
        assignee: req.query.assignee,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        q: req.query.q,
      };

      const { sessions, total } = await sessionService.getOrganizationSessions(
        orgId,
        req.user._id,
        filters,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, sessions, null, meta);
    } catch (error) {
      if (error.message.includes("not a member")) {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getSessionById(req, res, next) {
    try {
      const { sessionId } = req.params;

      const session = await sessionService.getSessionById(
        sessionId,
        req.user._id
      );

      sendSuccess(res, session);
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

  async updateSession(req, res, next) {
    try {
      const { sessionId } = req.params;

      const session = await sessionService.updateSession(
        sessionId,
        req.user._id,
        req.body
      );

      sendSuccess(res, session, "Session updated successfully");
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

  async deleteSession(req, res, next) {
    try {
      const { sessionId } = req.params;

      await sessionService.deleteSession(sessionId, req.user._id);

      sendSuccess(res, null, "Session deleted successfully");
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

  async duplicateSession(req, res, next) {
    try {
      const { sessionId } = req.params;

      const session = await sessionService.duplicateSession(
        sessionId,
        req.user._id
      );

      sendSuccess(res, session, "Session duplicated successfully", null, 201);
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
}

module.exports = new SessionController();
