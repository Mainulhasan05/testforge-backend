const featureService = require("../services/featureService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class FeatureController {
  async createFeature(req, res, next) {
    try {
      const { sessionId } = req.params;

      const feature = await featureService.createFeature(
        sessionId,
        req.user._id,
        req.body
      );

      sendSuccess(res, feature, "Feature created successfully", null, 201);
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

  async getSessionFeatures(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { page, limit } = getPaginationParams(req.query);
      const filters = {
        q: req.query.q,
      };

      const { features, total } = await featureService.getSessionFeatures(
        sessionId,
        req.user._id,
        filters,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, features, null, meta);
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

  async getFeatureById(req, res, next) {
    try {
      const { featureId } = req.params;

      const feature = await featureService.getFeatureById(
        featureId,
        req.user._id
      );

      sendSuccess(res, feature);
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

  async updateFeature(req, res, next) {
    try {
      const { featureId } = req.params;

      const feature = await featureService.updateFeature(
        featureId,
        req.user._id,
        req.body
      );

      sendSuccess(res, feature, "Feature updated successfully");
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

  async deleteFeature(req, res, next) {
    try {
      const { featureId } = req.params;

      await featureService.deleteFeature(featureId, req.user._id);

      sendSuccess(res, null, "Feature deleted successfully");
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

module.exports = new FeatureController();
