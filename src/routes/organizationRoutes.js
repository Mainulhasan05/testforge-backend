const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organizationController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} = require("../validators/organizationValidator");

router.post(
  "/",
  authenticate,
  validate(createOrganizationSchema),
  organizationController.createOrganization
);
router.get("/", authenticate, organizationController.getUserOrganizations);
router.get("/:orgId/stats", authenticate, organizationController.getOrganizationStats);
router.get("/:orgId", authenticate, organizationController.getOrganizationById);
router.put(
  "/:orgId",
  authenticate,
  validate(updateOrganizationSchema),
  organizationController.updateOrganization
);
router.post(
  "/:orgId/members",
  authenticate,
  validate(addMemberSchema),
  organizationController.addMember
);
router.get(
  "/:orgId/members",
  authenticate,
  organizationController.getOrganizationMembers
);
router.put(
  "/:orgId/members/:userId",
  authenticate,
  validate(updateMemberRoleSchema),
  organizationController.updateMemberRole
);
router.delete(
  "/:orgId/members/:userId",
  authenticate,
  organizationController.removeMember
);

module.exports = router;
