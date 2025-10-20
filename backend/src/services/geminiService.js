const { GoogleGenerativeAI } = require("@google/generative-ai");
const Food = require("../models/Food");
const { Op } = require("sequelize");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Parse JSON from Gemini response
const parseGeminiResponse = (text) => {
  try {
    // Extract JSON from the response (Gemini might wrap it in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (err) {
    console.error("Error parsing Gemini response:", err);
    return null;
  }
};

// Get food nutrition info using Gemini Vision
exports.getFoodNutritionFromImage = async (imageBuffer, mimeType) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyze this food image and provide nutritional information. 
    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "foodName": "name of the food",
      "estimatedQuantityGrams": 100,
      "category": "fruits|vegetables|grains|protein|dairy|oils|sweets|beverages|other",
      "caloriesPer100g": number,
      "proteinGrams": number,
      "carbsGrams": number,
      "fatsGrams": number,
      "fiberGrams": number,
      "sugarGrams": number,
      "sodiumMg": number,
      "allergens": ["allergen1", "allergen2"],
      "ingredients": ["ingredient1", "ingredient2"],
      "confidence": 0.95
    }
    
    Be precise with nutritional values. If uncertain, make reasonable estimates based on typical values for that food.`;

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const responseText = response.response.text();
    const nutritionData = parseGeminiResponse(responseText);

    if (!nutritionData) {
      throw new Error("Failed to parse Gemini response");
    }

    return nutritionData;
  } catch (err) {
    console.error("Gemini vision error:", err.message);
    throw err;
  }
};

// Get food nutrition info using Gemini text analysis
exports.getFoodNutritionFromText = async (foodName) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `Provide detailed nutritional information for "${foodName}". 
    Return ONLY a JSON object with this exact structure (no markdown, no extra text):
    {
      "foodName": "exact name",
      "category": "fruits|vegetables|grains|protein|dairy|oils|sweets|beverages|other",
      "caloriesPer100g": number,
      "proteinGrams": number,
      "carbsGrams": number,
      "fatsGrams": number,
      "fiberGrams": number,
      "sugarGrams": number,
      "sodiumMg": number,
      "allergens": ["common allergens if any"],
      "ingredients": ["common ingredients"],
      "confidence": 0.9
    }
    
    Use standard nutritional databases for accuracy. All values should be per 100 grams.`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    const nutritionData = parseGeminiResponse(responseText);

    if (!nutritionData) {
      throw new Error("Failed to parse Gemini response");
    }

    return nutritionData;
  } catch (err) {
    console.error("Gemini text analysis error:", err.message);
    throw err;
  }
};

// Search for food in database or get suggestions from Gemini
exports.searchOrSuggestFood = async (foodName) => {
  try {
    // First check local database
    let food = await Food.findOne({
      where: {
        name: {
          [Op.iLike]: `%${foodName}%`,
        },
      },
    });

    if (food) {
      return [food];
    }

    // If not found, use Gemini to get nutrition data and create it
    const nutritionData = await exports.getFoodNutritionFromText(foodName);

    if (nutritionData) {
      food = await exports.createOrFetchFood(nutritionData);
      return [food];
    }

    return [];
  } catch (err) {
    console.error("Search/suggest food error:", err.message);
    return [];
  }
};

// Create or fetch food from database
exports.createOrFetchFood = async (foodData) => {
  try {
    // Check if food already exists
    let food = await Food.findOne({
      where: {
        name: {
          [Op.iLike]: foodData.name || foodData.foodName,
        },
      },
    });

    if (!food) {
      food = await Food.create({
        name: foodData.name || foodData.foodName,
        category: foodData.category || "other",
        caloriesPer100g: foodData.caloriesPer100g || 0,
        proteinGrams: foodData.proteinGrams || 0,
        carbsGrams: foodData.carbsGrams || 0,
        fatsGrams: foodData.fatsGrams || 0,
        fiberGrams: foodData.fiberGrams || 0,
        sugarGrams: foodData.sugarGrams || 0,
        sodiumMg: foodData.sodiumMg || 0,
        source: "gemini",
        sourceId: (foodData.name || foodData.foodName)
          .toLowerCase()
          .replace(/\s+/g, "_"),
        allergens: foodData.allergens || [],
        ingredients: foodData.ingredients || [],
        isVerified: false,
      });
    }

    return food;
  } catch (err) {
    console.error("Create/fetch food error:", err.message);
    throw err;
  }
};

// Detect allergens in food
exports.detectAllergens = async (foodId, userAllergens) => {
  try {
    const food = await Food.findByPk(foodId);
    if (!food) return { hasAllergen: false, detectedAllergens: [] };

    const detectedAllergens = food.allergens.filter((allergen) =>
      userAllergens.some(
        (userAllergen) =>
          userAllergen.toLowerCase().includes(allergen.toLowerCase()) ||
          allergen.toLowerCase().includes(userAllergen.toLowerCase())
      )
    );

    return {
      hasAllergen: detectedAllergens.length > 0,
      detectedAllergens,
      severity: detectedAllergens.length > 0 ? "high" : "none",
    };
  } catch (err) {
    console.error("Detect allergens error:", err.message);
    return { hasAllergen: false, detectedAllergens: [] };
  }
};

// Calculate nutrition for quantity
exports.calculateNutritionForQuantity = (food, quantityGrams) => {
  const multiplier = quantityGrams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * multiplier),
    protein: parseFloat((food.proteinGrams * multiplier).toFixed(2)),
    carbs: parseFloat((food.carbsGrams * multiplier).toFixed(2)),
    fats: parseFloat((food.fatsGrams * multiplier).toFixed(2)),
    fiber: parseFloat((food.fiberGrams * multiplier).toFixed(2)),
    sugar: parseFloat((food.sugarGrams * multiplier).toFixed(2)),
    sodium: parseFloat((food.sodiumMg * multiplier).toFixed(2)),
  };
};

// Get meal suggestions based on inventory
exports.getMealSuggestions = async (availableIngredients) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const ingredientList = availableIngredients.join(", ");

    const prompt = `Based on these available ingredients: ${ingredientList}
    
    Suggest 3 healthy meal ideas. Return ONLY a JSON array with this structure (no markdown):
    [
      {
        "mealName": "name",
        "description": "brief description",
        "ingredients": ["ingredient1", "ingredient2"],
        "estimatedCalories": number,
        "preparationTime": "30 mins",
        "healthRating": "★★★★★"
      }
    ]
    
    Make suggestions balanced and nutritious.`;

    const response = await model.generateContent(prompt);
    const responseText = response.response.text();
    const suggestions = parseGeminiResponse(
      responseText.replace("[\n", "[").replace("\n]", "]")
    );

    return Array.isArray(suggestions) ? suggestions : [];
  } catch (err) {
    console.error("Get meal suggestions error:", err.message);
    return [];
  }
};

module.exports = exports;
