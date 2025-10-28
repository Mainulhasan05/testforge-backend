const Bytez = require("bytez.js");
const { GoogleGenAI } = require("@google/genai");
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

    // Initialize Google Gemini SDK
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenAI({ apiKey: this.geminiApiKey });
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
   */
  async generateWithGemini(inputText, options = {}) {
    if (!this.geminiApiKey) {
      throw new Error("Gemini API key is not configured");
    }

    try {
      // Use Gemini 2.0 Flash for faster responses
      const prompt = this.buildPrompt(inputText, options);

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: prompt,
      });

      const text = response.text;

      return this.parseModelOutput(text);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  /**
   * Build the AI prompt for test case generation
   */
  buildPrompt(inputText, options = {}) {
    const { additionalContext = "", testType = "functional" } = options;

    return `You are a QA test case generation expert. Generate comprehensive test cases in strict JSON format based on the provided input.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. If test cases can be generated, return a JSON array of test case objects
3. Each test case MUST have: title (string), note (string), expectedOutput (string), sortOrder (number starting from 0)
4. If the input is unclear or insufficient, return exactly: {"isValid":false}
5. Generate realistic, detailed, and actionable test cases
6. Test type: ${testType}
7. Include positive scenarios, negative scenarios, edge cases, and boundary conditions
8. Make test steps clear and specific with exact actions to perform
9. Expected outputs should be precise and measurable

INPUT SCENARIO:
${inputText}

${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ""}

EXAMPLES:

Example 1 - Login Feature:
[
  {
    "title": "Successful Login with Valid Credentials",
    "note": "1. Navigate to login page\n2. Enter valid username: 'testuser@example.com'\n3. Enter valid password: 'Test@123'\n4. Click 'Login' button",
    "expectedOutput": "User is authenticated successfully, redirected to dashboard page, and username is displayed in the header",
    "sortOrder": 0
  },
  {
    "title": "Login Failure with Invalid Password",
    "note": "1. Navigate to login page\n2. Enter valid username: 'testuser@example.com'\n3. Enter incorrect password: 'wrongpass'\n4. Click 'Login' button",
    "expectedOutput": "Error message 'Invalid username or password' is displayed below the password field, user remains on login page",
    "sortOrder": 1
  },
  {
    "title": "Login with Empty Credentials",
    "note": "1. Navigate to login page\n2. Leave username field empty\n3. Leave password field empty\n4. Click 'Login' button",
    "expectedOutput": "Validation errors appear: 'Username is required' and 'Password is required', login button remains disabled or form doesn't submit",
    "sortOrder": 2
  },
  {
    "title": "SQL Injection Attempt in Login",
    "note": "1. Navigate to login page\n2. Enter SQL injection string in username: ' OR '1'='1\n3. Enter any password\n4. Click 'Login' button",
    "expectedOutput": "Login fails with 'Invalid credentials' message, no SQL error is displayed, system remains secure",
    "sortOrder": 3
  }
]

Example 2 - Shopping Cart:
[
  {
    "title": "Add Single Item to Empty Cart",
    "note": "1. Navigate to products page\n2. Select a product\n3. Click 'Add to Cart' button\n4. Navigate to cart page",
    "expectedOutput": "Product appears in cart with correct name, price, quantity (1), cart total shows product price, cart badge shows '1'",
    "sortOrder": 0
  },
  {
    "title": "Add Multiple Items from Different Categories",
    "note": "1. Add item from Category A (e.g., Electronics)\n2. Add item from Category B (e.g., Clothing)\n3. Navigate to cart",
    "expectedOutput": "Both items appear in cart with correct details, cart total shows sum of both prices, cart organized by categories or chronologically",
    "sortOrder": 1
  }
]

Example 3 - Invalid Input:
{"isValid":false}

OUTPUT FORMAT:
Generate test cases ONLY for the scenario described in "INPUT SCENARIO" above. Return ONLY the JSON array or {"isValid":false} - nothing else.`;
  }

  /**
   * Sanitize JSON string to handle control characters and escape sequences
   */
  sanitizeJSON(jsonString) {
    try {
      // Try parsing first - if it works, return as is
      JSON.parse(jsonString);
      return jsonString;
    } catch (e) {
      // If parsing fails, try to fix common issues

      // Method 1: Try to parse and re-stringify using a more lenient approach
      try {
        // Replace unescaped newlines in string values (between quotes)
        // This regex finds strings and replaces literal newlines with \n
        let fixed = jsonString.replace(
          /"([^"\\]*(\\.[^"\\]*)*)"/g,
          (match) => {
            return match
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t');
          }
        );

        // Try parsing the fixed version
        JSON.parse(fixed);
        return fixed;
      } catch (e2) {
        // If that doesn't work, try a more aggressive approach
        // Parse line by line and rebuild
        try {
          let inString = false;
          let result = '';
          let escapeNext = false;

          for (let i = 0; i < jsonString.length; i++) {
            const char = jsonString[i];
            const prevChar = i > 0 ? jsonString[i - 1] : '';

            if (char === '"' && prevChar !== '\\') {
              inString = !inString;
              result += char;
            } else if (inString) {
              // Inside a string - escape control characters
              if (char === '\n') {
                result += '\\n';
              } else if (char === '\r') {
                result += '\\r';
              } else if (char === '\t') {
                result += '\\t';
              } else if (char === '\b') {
                result += '\\b';
              } else if (char === '\f') {
                result += '\\f';
              } else {
                result += char;
              }
            } else {
              result += char;
            }
          }

          // Verify the result is valid JSON
          JSON.parse(result);
          return result;
        } catch (e3) {
          // If all else fails, return original and let the error handler deal with it
          return jsonString;
        }
      }
    }
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

      // Fix common JSON issues from AI responses
      // Replace literal newlines within strings with \n
      // This handles cases where the AI includes actual newlines instead of escape sequences
      cleanedOutput = this.sanitizeJSON(cleanedOutput);

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
    if (this.geminiApiKey) {
      models.push({
        id: "gemini",
        name: "Google Gemini 2.0 Flash",
        description: "Latest Gemini model - fast, efficient with advanced reasoning",
        provider: "Google",
        status: "active",
      });
    }
    if (this.bytezApiKey) {
      models.push({
        id: "bytez-kei",
        name: "Bytez Kei (NMT Test)",
        description: "Optimized for test case generation with specialized training",
        provider: "Bytez",
        status: "active",
      });
    }

    console.log("Available AI models:", models);
    

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
