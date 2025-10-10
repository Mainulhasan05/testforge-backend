const invitationService = require("../services/invitationService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class InvitationController {
  async createInvitation(req, res, next) {
    try {
      const { orgId } = req.params;
      const { email, role } = req.body;

      const invitation = await invitationService.createInvitation(
        orgId,
        email,
        req.user._id,
        role
      );

      sendSuccess(res, invitation, "Invitation sent successfully", null, 201);
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      if (
        error.message.includes("already a member") ||
        error.message.includes("already exists")
      ) {
        return sendError(res, error.message, "ALREADY_EXISTS", {}, 409);
      }
      next(error);
    }
  }

  async getOrganizationInvitations(req, res, next) {
    try {
      const { orgId } = req.params;
      const { page, limit } = getPaginationParams(req.query);

      const { invitations, total } =
        await invitationService.getOrganizationInvitations(
          orgId,
          req.user._id,
          page,
          limit
        );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, invitations, null, meta);
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

  async verifyInvitationToken(req, res, next) {
    try {
      const { token } = req.params;

      const result = await invitationService.verifyInvitationToken(token);

      sendSuccess(res, result, "Invitation is valid");
    } catch (error) {
      if (error.message.includes("Invalid or expired")) {
        return sendError(res, error.message, "INVALID_INVITATION", {}, 400);
      }
      next(error);
    }
  }

  async acceptInvitation(req, res, next) {
    try {
      const { token } = req.body;

      const result = await invitationService.acceptInvitation(
        token,
        req.user._id
      );

      sendSuccess(res, result, "Invitation accepted successfully");
    } catch (error) {
      if (error.message.includes("Invalid or expired")) {
        return sendError(res, error.message, "INVALID_INVITATION", {}, 400);
      }
      if (error.message.includes("different email")) {
        return sendError(res, error.message, "EMAIL_MISMATCH", {}, 403);
      }
      if (error.message.includes("already a member")) {
        return sendError(res, error.message, "ALREADY_MEMBER", {}, 409);
      }
      next(error);
    }
  }

  async declineInvitation(req, res, next) {
    try {
      const { token } = req.body;

      const invitation = await invitationService.declineInvitation(token);

      sendSuccess(res, invitation, "Invitation declined");
    } catch (error) {
      if (error.message.includes("Invalid or expired")) {
        return sendError(res, error.message, "INVALID_INVITATION", {}, 400);
      }
      next(error);
    }
  }

  async cancelInvitation(req, res, next) {
    try {
      const { invitationId } = req.params;

      const invitation = await invitationService.cancelInvitation(
        invitationId,
        req.user._id
      );

      sendSuccess(res, invitation, "Invitation cancelled");
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

  async resendInvitation(req, res, next) {
    try {
      const { invitationId } = req.params;

      const invitation = await invitationService.resendInvitation(
        invitationId,
        req.user._id
      );

      sendSuccess(res, invitation, "Invitation resent successfully");
    } catch (error) {
      if (error.message.includes("not found")) {
        return sendError(res, error.message, "NOT_FOUND", {}, 404);
      }
      if (error.message.includes("Only owners")) {
        return sendError(res, error.message, "PERMISSION_DENIED", {}, 403);
      }
      if (error.message.includes("Can only resend")) {
        return sendError(res, error.message, "INVALID_STATUS", {}, 400);
      }
      next(error);
    }
  }

  async getUserInvitations(req, res, next) {
    try {
      const { page, limit } = getPaginationParams(req.query);
      const userEmail = req.user.email;

      const { invitations, total } = await invitationService.getUserInvitations(
        userEmail,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, invitations, null, meta);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvitationController();
