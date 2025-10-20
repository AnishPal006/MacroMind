const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: 'models/gemini-pro' }).listModels?.();
    console.log('Available models:', models);
  } catch (err) {
    console.log('Error listing models:', err.message);
    
    // Try different models
    const modelsToTry = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'models/gemini-pro',
      'models/gemini-1.5-pro'
    ];
    
    console.log('\nTrying models:');
    for (const model of modelsToTry) {
      try {
        const test = genAI.getGenerativeModel({ model });
        console.log(`✓ ${model} - might work`);
      } catch (e) {
        console.log(`✗ ${model} - error`);
      }
    }
  }
}

listModels();
