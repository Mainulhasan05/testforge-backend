const caseService = require("../services/caseService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class CaseController {
  async createCase(req, res, next) {
    try {
      const { featureId } = req.params;

      const testCase = await caseService.createCase(
        featureId,
        req.user._id,
        req.body
      );

      sendSuccess(res, testCase, "Case created successfully", null, 201);
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

  async getFeatureCases(req, res, next) {
    try {
      const { featureId } = req.params;
      const { page, limit } = getPaginationParams(req.query);
      const filters = {
        status: req.query.status,
        q: req.query.q,
      };

      const { cases, total } = await caseService.getFeatureCases(
        featureId,
        req.user._id,
        filters,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, cases, null, meta);
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

  async getCaseById(req, res, next) {
    try {
      const { caseId } = req.params;

      const testCase = await caseService.getCaseById(caseId, req.user._id);

      sendSuccess(res, testCase);
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

  async updateCase(req, res, next) {
    try {
      const { caseId } = req.params;

      const testCase = await caseService.updateCase(
        caseId,
        req.user._id,
        req.body
      );

      sendSuccess(res, testCase, "Case updated successfully");
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

  async deleteCase(req, res, next) {
    try {
      const { caseId } = req.params;

      await caseService.deleteCase(caseId, req.user._id);

      sendSuccess(res, null, "Case deleted successfully");
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

  async bulkCreateCases(req, res, next) {
    try {
      const { featureId } = req.params;
      const { cases } = req.body;

      const createdCases = await caseService.bulkCreateCases(
        featureId,
        req.user._id,
        cases
      );

      sendSuccess(
        res,
        createdCases,
        `${createdCases.length} cases created successfully`,
        null,
        201
      );
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

module.exports = new CaseController();
