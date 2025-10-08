const express = require("express");
const router = express.Router();
const invitationController = require("../controllers/invitationController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createInvitationSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
} = require("../validators/invitationValidator");

router.post(
  "/organizations/:orgId/invitations",
  authenticate,
  validate(createInvitationSchema),
  invitationController.createInvitation
);
router.get(
  "/organizations/:orgId/invitations",
  authenticate,
  invitationController.getOrganizationInvitations
);
router.get(
  "/invitations/verify/:token",
  invitationController.verifyInvitationToken
);
router.post(
  "/invitations/accept",
  authenticate,
  validate(acceptInvitationSchema),
  invitationController.acceptInvitation
);
router.post(
  "/invitations/decline",
  validate(declineInvitationSchema),
  invitationController.declineInvitation
);
router.delete(
  "/invitations/:invitationId",
  authenticate,
  invitationController.cancelInvitation
);
router.post(
  "/invitations/:invitationId/resend",
  authenticate,
  invitationController.resendInvitation
);

module.exports = router;
