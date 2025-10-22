const path = require("path"); // <-- ADD THIS
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Let's try listing models directly, as 'listModels' might not be on the model object
    const models = await genAI.listModels(); // <-- ATTEMPT 1: List all models

    console.log("Available models (from listModels):");
    for await (const m of models) {
      if (m.supportedGenerationMethods.includes("generateContent")) {
        console.log(`  ✓ ${m.name} (supports generateContent)`);
      }
    }
  } catch (err) {
    console.log("Error listing models:", err.message);
    console.log("\nAttempting individual model checks:");

    // Fallback to trying specific models if listModels fails
    const modelsToTry = ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash"];

    for (const model of modelsToTry) {
      try {
        genAI.getGenerativeModel({ model });
        console.log(`  ✓ ${model} - exists`);
      } catch (e) {
        console.log(`  ✗ ${model} - error: ${e.message.split("] ")[1]}`); // Show simple error
      }
    }
  }
}

listModels();
