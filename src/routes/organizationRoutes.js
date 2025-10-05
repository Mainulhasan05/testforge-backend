const express = require("express");
const router = express.Router();
const organizationController = require("../controllers/organizationController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  createOrganizationSchema,
  addMemberSchema,
} = require("../validators/organizationValidator");

router.post(
  "/",
  authenticate,
  validate(createOrganizationSchema),
  organizationController.createOrganization
);
router.get("/", authenticate, organizationController.getUserOrganizations);
router.get("/:orgId", authenticate, organizationController.getOrganizationById);
router.post(
  "/:orgId/members",
  authenticate,
  validate(addMemberSchema),
  organizationController.addMember
);
router.delete(
  "/:orgId/members/:userId",
  authenticate,
  organizationController.removeMember
);

module.exports = router;
