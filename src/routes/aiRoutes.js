const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const { authenticate } = require("../middlewares/auth");

// Generate test cases using AI
router.post(
  "/generate-test-cases",
  authenticate,
  aiController.generateTestCases
);

// Get available AI models
router.get("/models", authenticate, aiController.getAvailableModels);

module.exports = router;
