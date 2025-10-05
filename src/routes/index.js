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
router.use("/organizations", organizationRoutes);
router.use("/api", sessionRoutes);
router.use("/api", featureRoutes);
router.use("/api", caseRoutes);
router.use("/api", feedbackRoutes);
router.use("/api", changeLogRoutes);

module.exports = router;
