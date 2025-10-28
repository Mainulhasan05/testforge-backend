/**
 * Test script for Gemini AI integration
 * Run with: node test-gemini.js
 */

const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGeminiAPI() {
  console.log("🧪 Testing Gemini AI Integration...\n");

  if (!GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in .env file");
    process.exit(1);
  }

  console.log("✓ API Key loaded");

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log("✓ GoogleGenAI instance created");

    console.log("\n📝 Generating test cases for login feature...\n");

    const prompt = `You are a QA test case generation expert. Generate comprehensive test cases in strict JSON format.

CRITICAL RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Generate a JSON array of test case objects
3. Each test case MUST have: title (string), note (string), expectedOutput (string), sortOrder (number)
4. Generate realistic, detailed, and actionable test cases
5. Include positive scenarios, negative scenarios, and edge cases

INPUT SCENARIO:
Login feature with email and password

OUTPUT FORMAT:
Generate test cases ONLY for the scenario described above. Return ONLY the JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    console.log("✓ Response received from Gemini\n");

    const text = response.text;
    console.log("Raw response:\n", text.substring(0, 500) + "...\n");

    // Try to parse as JSON
    let cleanedOutput = text.trim();
    if (cleanedOutput.startsWith("```json")) {
      cleanedOutput = cleanedOutput.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
    } else if (cleanedOutput.startsWith("```")) {
      cleanedOutput = cleanedOutput.replace(/```\n?/g, "").replace(/```\n?$/g, "");
    }

    const testCases = JSON.parse(cleanedOutput.trim());

    console.log("✅ Successfully parsed JSON response");
    console.log(`📊 Generated ${testCases.length} test cases:\n`);

    testCases.forEach((tc, index) => {
      console.log(`${index + 1}. ${tc.title}`);
      console.log(`   Steps: ${tc.note.substring(0, 80)}...`);
      console.log(`   Expected: ${tc.expectedOutput.substring(0, 80)}...`);
      console.log("");
    });

    console.log("✅ All tests passed! Gemini integration is working correctly.\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response:", error.response);
    }
    process.exit(1);
  }
}

testGeminiAPI();
