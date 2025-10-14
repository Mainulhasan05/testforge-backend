const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const organizationRoutes = require("./organizationRoutes");
const sessionRoutes = require("./sessionRoutes");
const featureRoutes = require("./featureRoutes");
const caseRoutes = require("./caseRoutes");
const feedbackRoutes = require("./feedbackRoutes");
const changeLogRoutes = require("./changeLogRoutes");
const invitationRoutes = require("./invitationRoutes");
const statisticsRoutes = require("./statisticsRoutes");
const sessionDashboardRoutes = require("./sessionDashboardRoutes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orgs", organizationRoutes);
router.use("/orgs", sessionRoutes);
router.use("/sessions", sessionRoutes); // Add direct session routes for duplicate, assign, unassign
router.use("/sessions", featureRoutes);
router.use("/sessions", sessionDashboardRoutes); // Add dashboard routes
router.use("/features", caseRoutes);
router.use("/cases", feedbackRoutes);
router.use("/feedback", feedbackRoutes); // Add direct feedback route for update/delete
router.use("/changelog", changeLogRoutes);
router.use("/invitations", invitationRoutes);
router.use("/statistics", statisticsRoutes);

module.exports = router;
