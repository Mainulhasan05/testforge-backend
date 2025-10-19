const aiService = require("../services/aiService");
const { sendSuccess, sendError } = require("../utils/response");

class AIController {
  /**
   * Generate test cases using AI
   */
  async generateTestCases(req, res, next) {
    try {
      const { inputText, model = "bytez-kei", options = {} } = req.body;

      // Validate input
      if (!inputText) {
        return sendError(
          res,
          "Input text is required for test case generation",
          "VALIDATION_ERROR",
          {},
          400
        );
      }

      // Generate test cases
      const result = await aiService.generateTestCases(
        inputText,
        model,
        options
      );

      if (!result.success) {
        return sendSuccess(
          res,
          {
            testCases: [],
            message: result.message,
          },
          result.message
        );
      }

      sendSuccess(
        res,
        {
          testCases: result.testCases,
          model: model,
          count: result.testCases.length,
        },
        result.message
      );
    } catch (error) {
      console.error("Error in generateTestCases:", error);
      if (
        error.message.includes("API key") ||
        error.message.includes("not configured")
      ) {
        return sendError(
          res,
          error.message,
          "AI_SERVICE_NOT_CONFIGURED",
          {},
          503
        );
      }
      next(error);
    }
  }

  /**
   * Get available AI models
   */
  async getAvailableModels(req, res, next) {
    try {
      const models = aiService.getAvailableModels();

      sendSuccess(
        res,
        {
          models,
          count: models.length,
        },
        "Available AI models retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
