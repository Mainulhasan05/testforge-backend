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
router.use("/orgs", sessionRoutes); // Organization-scoped: /orgs/:orgId/sessions
router.use("/sessions", sessionRoutes); // Direct session routes: /sessions/:sessionId
router.use("/sessions", featureRoutes); // Session-scoped: /sessions/:sessionId/features
router.use("/features", featureRoutes); // Direct feature routes: /features/:featureId
router.use("/sessions", sessionDashboardRoutes); // Dashboard routes: /sessions/:sessionId/dashboard
router.use("/features", caseRoutes); // Feature-scoped: /features/:featureId/cases
router.use("/cases", caseRoutes); // Direct case routes: /cases/:caseId
router.use("/cases", feedbackRoutes); // Case-scoped: /cases/:caseId/feedback
router.use("/feedback", feedbackRoutes); // Direct feedback route: /feedback/:feedbackId
router.use("/changelog", changeLogRoutes);
router.use("/invitations", invitationRoutes);
router.use("/statistics", statisticsRoutes);

module.exports = router;
