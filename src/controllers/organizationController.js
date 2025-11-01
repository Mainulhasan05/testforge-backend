const organizationService = require("../services/organizationService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class OrganizationController {
  async createOrganization(req, res, next) {
    try {
      const { name, description } = req.body;

      const organization = await organizationService.createOrganization(
        name,
        req.user._id,
        description
      );

      sendSuccess(
        res,
        organization,
        "Organization created successfully",
        null,
        201
      );
    } catch (error) {
      next(error);
    }
  }

  async getUserOrganizations(req, res, next) {
    try {
      const { page, limit } = getPaginationParams(req.query);

      const { organizations, total } =
        await organizationService.getUserOrganizations(
          req.user._id,
          page,
          limit
        );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, organizations, null, meta);
    } catch (error) {
      next(error);
    }
  }

  async getOrganizationById(req, res, next) {
    try {
      const { orgId } = req.params;

      const organization = await organizationService.getOrganizationById(orgId);

      sendSuccess(res, organization);
    } catch (error) {
      if (error.message === "Organization not found") {
        return sendError(res, error.message, "ORG_NOT_FOUND", {}, 404);
      }
      next(error);
    }
  }

  async updateOrganization(req, res, next) {
    try {
      const { orgId } = req.params;
      const { name, description } = req.body;

      const organization = await organizationService.updateOrganization(
        orgId,
        req.user._id,
        { name, description }
      );

      sendSuccess(res, organization, "Organization updated successfully");
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

  async deleteOrganization(req, res, next) {
    try {
      const { orgId } = req.params;

      const organization = await organizationService.deleteOrganization(
        orgId,
        req.user._id
      );

      sendSuccess(res, organization, "Organization deleted successfully");
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

  async addMember(req, res, next) {
    try {
      const { orgId } = req.params;
      const { userId, role } = req.body;

      const organization = await organizationService.addMember(
        orgId,
        userId,
        req.user._id,
        role
      );

      sendSuccess(res, organization, "Member added successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (
        error.message.includes("permissions") ||
        error.message.includes("Only")
      ) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      if (error.message.includes("already a member")) {
        return sendError(res, error.message, "ALREADY_MEMBER", {}, 409);
      }
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      const { orgId, userId } = req.params;

      const organization = await organizationService.removeMember(
        orgId,
        userId,
        req.user._id
      );

      sendSuccess(res, organization, "Member removed successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (
        error.message.includes("permissions") ||
        error.message.includes("Only")
      ) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async getOrganizationMembers(req, res, next) {
    try {
      const { orgId } = req.params;
      const { page, limit } = getPaginationParams(req.query);

      const { members, total } =
        await organizationService.getOrganizationMembers(
          orgId,
          req.user._id,
          page,
          limit
        );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, members, null, meta);
    } catch (error) {
      if (error.message === "Organization not found") {
        return sendError(res, error.message, "ORG_NOT_FOUND", {}, 404);
      }
      if (error.message === "Access denied") {
        return sendError(res, error.message, "ACCESS_DENIED", {}, 403);
      }
      next(error);
    }
  }

  async updateMemberRole(req, res, next) {
    try {
      const { orgId, userId } = req.params;
      const { role } = req.body;

      const organization = await organizationService.updateMemberRole(
        orgId,
        userId,
        req.user._id,
        role
      );

      sendSuccess(res, organization, "Member role updated successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      if (error.message.includes("not a member")) {
        return sendError(res, error.message, "NOT_MEMBER", {}, 400);
      }
      next(error);
    }
  }

  async getOrganizationStats(req, res, next) {
    try {
      const { orgId } = req.params;

      const stats = await organizationService.getOrganizationStats(orgId, req.user._id);

      sendSuccess(res, stats, "Organization statistics retrieved successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("not a member")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      next(error);
    }
  }
}

module.exports = new OrganizationController();
