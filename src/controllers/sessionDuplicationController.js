const sessionDuplicationService = require("../services/sessionDuplicationService");
const { sendSuccess, sendError } = require("../utils/response");

class SessionDuplicationController {
  async duplicateSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const duplicationOptions = req.body;

      const result = await sessionDuplicationService.duplicateSession(
        sessionId,
        req.user._id,
        duplicationOptions
      );

      sendSuccess(res, result, "Session duplicated successfully", null, 201);
    } catch (error) {
      if (error.message === "Session not found") {
        return sendError(res, error.message, "SESSION_NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async duplicateSessionWithCustomization(req, res, next) {
    try {
      const { sessionId } = req.params;
      const customization = req.body;

      const result =
        await sessionDuplicationService.duplicateSessionWithCustomization(
          sessionId,
          req.user._id,
          customization
        );

      sendSuccess(
        res,
        result,
        "Session duplicated with customization successfully",
        null,
        201
      );
    } catch (error) {
      if (error.message === "Session not found") {
        return sendError(res, error.message, "SESSION_NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getSessionDuplicatePreview(req, res, next) {
    try {
      const { sessionId } = req.params;

      const preview =
        await sessionDuplicationService.getSessionDuplicatePreview(
          sessionId,
          req.user._id
        );

      sendSuccess(res, preview, "Duplicate preview retrieved successfully");
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
}

module.exports = new SessionDuplicationController();
