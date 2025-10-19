const Bytez = require("bytez.js");
const config = require("../config");

/**
 * AI Service for Test Case Generation
 * Supports multiple AI models with easy switching
 */
class AIService {
  constructor() {
    // Initialize Bytez SDK
    this.bytezApiKey = config.ai?.bytezApiKey || process.env.BYTEZ_API_KEY;
    this.geminiApiKey = config.ai?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (this.bytezApiKey) {
      this.sdk = new Bytez(this.bytezApiKey);
    }
  }

  /**
   * Generate test cases using specified AI model
   * @param {string} inputText - The description/requirements for test cases
   * @param {string} modelName - The AI model to use (default: bytez-kei)
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Array of generated test cases
   */
  async generateTestCases(inputText, modelName = "bytez-kei", options = {}) {
    try {
      // Validate input
      if (!inputText || inputText.trim().length === 0) {
        throw new Error("Input text is required for test case generation");
      }

      // Route to appropriate model
      switch (modelName) {
        case "bytez-kei":
          return await this.generateWithBytezKei(inputText, options);
        case "gemini":
          return await this.generateWithGemini(inputText, options);
        default:
          throw new Error(`Unsupported AI model: ${modelName}`);
      }
    } catch (error) {
      console.error("AI Test Case Generation Error:", error);
      throw error;
    }
  }

  /**
   * Generate test cases using Bytez Kei model
   */
  async generateWithBytezKei(inputText, options = {}) {
    if (!this.bytezApiKey) {
      throw new Error("Bytez API key is not configured");
    }

    const model = this.sdk.model("CK0607/kei-nmt-test-loralora-full");

    const prompt = this.buildPrompt(inputText, options);

    const { error, output } = await model.run([
      {
        role: "user",
        content: prompt,
      },
    ]);

    if (error) {
      throw new Error(`Bytez API Error: ${error}`);
    }

    return this.parseModelOutput(output.content);
  }

  /**
   * Generate test cases using Google Gemini
   * (Placeholder for future implementation)
   */
  async generateWithGemini(inputText, options = {}) {
    if (!this.geminiApiKey) {
      throw new Error("Gemini API key is not configured");
    }

    // TODO: Implement Gemini integration
    // For now, return a placeholder
    throw new Error(
      "Gemini model integration is not yet implemented. Please use bytez-kei model."
    );
  }

  /**
   * Build the AI prompt for test case generation
   */
  buildPrompt(inputText, options = {}) {
    const { additionalContext = "", testType = "functional" } = options;

    return `Generate test cases in strict JSON format.
IMPORTANT: Return ONLY valid JSON, no additional text or markdown.

Rules for JSON output:
1. If test cases can be generated, return an array of test case objects
2. Each test case must have: title (string), note (string), expectedOutput (string), sortOrder (number)
3. If no test cases can be generated, return exactly: {"isValid":false}
4. Only use the given context - do not generate anything by yourself
5. Generate realistic, specific test cases based on the input
6. Ensure test cases are ${testType} tests
7. Include edge cases and negative scenarios where applicable

Input text: ${inputText}

${additionalContext ? `Additional context: ${additionalContext}` : ""}

Example valid output for a login scenario:
[
  {
    "title": "Successful Login with Valid Credentials",
    "note": "Enter valid username and password, click login button",
    "expectedOutput": "User is logged in successfully and redirected to dashboard",
    "sortOrder": 0
  },
  {
    "title": "Login Failure with Invalid Password",
    "note": "Enter valid username but incorrect password, click login",
    "expectedOutput": "Error message displayed: 'Invalid credentials'",
    "sortOrder": 1
  }
]

Example for invalid input:
{"isValid":false}

Now generate test cases for the input provided above. Return ONLY the JSON array or {"isValid":false}.`;
  }

  /**
   * Parse and validate model output
   */
  parseModelOutput(outputContent) {
    try {
      // Clean up the output - remove markdown code blocks if present
      let cleanedOutput = outputContent.trim();

      // Remove markdown code block syntax if present
      if (cleanedOutput.startsWith("```json")) {
        cleanedOutput = cleanedOutput.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
      } else if (cleanedOutput.startsWith("```")) {
        cleanedOutput = cleanedOutput.replace(/```\n?/g, "").replace(/```\n?$/g, "");
      }

      cleanedOutput = cleanedOutput.trim();

      const parsedOutput = JSON.parse(cleanedOutput);

      // Check if output is valid
      if (parsedOutput.isValid === false) {
        return {
          success: false,
          message: "AI could not generate test cases from the provided input",
          testCases: [],
        };
      }

      // Validate structure
      if (!Array.isArray(parsedOutput)) {
        throw new Error("Output is not an array of test cases");
      }

      // Validate each test case has required fields
      const validatedTestCases = parsedOutput.map((testCase, index) => {
        if (!testCase.title || !testCase.note || !testCase.expectedOutput) {
          throw new Error(
            `Test case at index ${index} is missing required fields`
          );
        }

        return {
          title: testCase.title,
          note: testCase.note || "",
          expectedOutput: testCase.expectedOutput || "",
          sortOrder: testCase.sortOrder ?? index,
        };
      });

      return {
        success: true,
        message: `Successfully generated ${validatedTestCases.length} test cases`,
        testCases: validatedTestCases,
      };
    } catch (error) {
      console.error("Error parsing model output:", error);
      console.error("Raw output:", outputContent);
      throw new Error(
        `Failed to parse AI output: ${error.message}. The AI response may be invalid.`
      );
    }
  }

  /**
   * Get list of available models
   */
  getAvailableModels() {
    const models = [];

    if (this.bytezApiKey) {
      models.push({
        id: "bytez-kei",
        name: "Bytez Kei (NMT Test)",
        description: "Optimized for test case generation",
        provider: "Bytez",
        status: "active",
      });
    }

    if (this.geminiApiKey) {
      models.push({
        id: "gemini",
        name: "Google Gemini",
        description: "Coming soon",
        provider: "Google",
        status: "coming_soon",
      });
    }

    if (models.length === 0) {
      models.push({
        id: "none",
        name: "No AI models configured",
        description: "Please configure API keys in environment variables",
        provider: "None",
        status: "unavailable",
      });
    }

    return models;
  }
}

module.exports = new AIService();
