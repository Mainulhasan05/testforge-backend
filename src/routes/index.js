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

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/orgs", organizationRoutes);
router.use("/orgs", sessionRoutes);
router.use("/sessions", featureRoutes);
router.use("/features", caseRoutes);
router.use("/cases", feedbackRoutes);
router.use("/api", changeLogRoutes);

module.exports = router;
