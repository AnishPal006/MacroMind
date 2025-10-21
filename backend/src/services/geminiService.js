const { GoogleGenerativeAI } = require("@google/generative-ai");
const Food = require("../models/Food");
const InventoryItem = require("../models/InventoryItem");
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
exports.getMealSuggestions = async (userId) => {
  // Accept userId
  if (!userId) {
    console.error("User ID is required for meal suggestions.");
    return [];
  }
  try {
    // 1. Fetch user's inventory items
    const inventoryItems = await InventoryItem.findAll({
      where: { userId: userId },
      attributes: ["itemName"], // Only need the names
      // Optionally filter out items with zero quantity if needed
      // where: { userId: userId, quantity: { [Op.gt]: 0 } }
    });

    if (!inventoryItems || inventoryItems.length === 0) {
      console.log("No inventory items found for user:", userId);
      // Return an empty array or a specific message object
      return [
        { message: "Your inventory is empty. Add items to get suggestions." },
      ];
    }

    // 2. Format ingredient list from inventory item names
    // Use Set to get unique item names
    const uniqueItemNames = [
      ...new Set(inventoryItems.map((item) => item.itemName)),
    ];
    const ingredientList = uniqueItemNames.join(", ");

    // 3. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // Or gemini-1.5-flash

    const prompt = `Based ONLY on these available ingredients: ${ingredientList}

    Suggest up to 3 healthy and simple meal ideas (breakfast, lunch, or dinner) that primarily use these ingredients. Be creative but realistic. If very few ingredients are available, it's okay to suggest simple snacks or indicate limited options.

    Return ONLY a valid JSON array with this exact structure (no markdown formatting, no extra text):
    [
      {
        "mealName": "Name of the meal",
        "description": "Brief description (1-2 sentences)",
        "primaryIngredients": ["ingredient1 from list", "ingredient2 from list"],
        "estimatedPrepTime": "e.g., 15 mins",
        "type": "Breakfast | Lunch | Dinner | Snack"
      }
    ]

    Focus on using the provided ingredients. If essential common pantry staples (like oil, salt, pepper, basic spices) are obviously needed but not listed, you can assume they are available but don't list them in primaryIngredients. If not enough ingredients are available for full meals, suggest simple combinations or state that. If the list is empty or nonsensical, return an empty array or a message indicating so within the structure.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Clean up potential markdown formatting around the JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    let suggestions = [];
    if (jsonMatch) {
      try {
        suggestions = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error(
          "Failed to parse meal suggestions JSON:",
          parseError,
          "Raw response:",
          responseText
        );
        suggestions = [
          {
            mealName: "Error",
            description: "Could not parse suggestions.",
            primaryIngredients: [],
            estimatedPrepTime: "",
            type: "Error",
          },
        ];
      }
    } else {
      console.warn(
        "No valid JSON array found in meal suggestions response:",
        responseText
      );
      suggestions = [
        {
          mealName: "Info",
          description:
            "Could not generate suggestions based on current inventory.",
          primaryIngredients: [],
          estimatedPrepTime: "",
          type: "Info",
        },
      ];
    }

    return Array.isArray(suggestions) ? suggestions : [];
  } catch (err) {
    console.error("Get meal suggestions error:", err.message);
    // Return an error indication in the expected format
    return [
      {
        mealName: "Error",
        description: "Failed to generate suggestions due to an error.",
        primaryIngredients: [],
        estimatedPrepTime: "",
        type: "Error",
      },
    ];
  }
};

exports.getHealthAdvice = async (food, user) => {
  if (!food || !user) {
    console.warn("Missing food or user data for health advice.");
    return {
      suitability: "neutral",
      reason: "Could not determine suitability due to missing data.",
    };
  }

  try {
    // Use a model suitable for text analysis (e.g., gemini-1.5-flash or gemini-pro)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" }); // Or "gemini-pro"

    // Construct the prompt
    const prompt = `
        Analyze the suitability of the following food for a specific user.

        Food Details:
        Name: ${food.name || "N/A"}
        Category: ${food.category || "N/A"}
        Calories (per 100g): ${food.caloriesPer100g || "N/A"}
        Protein (per 100g): ${food.proteinGrams || "N/A"}g
        Carbs (per 100g): ${food.carbsGrams || "N/A"}g
        Sugar (per 100g): ${food.sugarGrams || "N/A"}g
        Fats (per 100g): ${food.fatsGrams || "N/A"}g
        Sodium (per 100g): ${food.sodiumMg || "N/A"}mg
        Fiber (per 100g): ${food.fiberGrams || "N/A"}g
        Ingredients: ${
          food.ingredients && food.ingredients.length > 0
            ? food.ingredients.join(", ")
            : "N/A"
        }
        Listed Allergens: ${
          food.allergens && food.allergens.length > 0
            ? food.allergens.join(", ")
            : "None"
        }

        User Health Profile:
        Allergies: ${
          user.allergies && user.allergies.length > 0
            ? user.allergies.join(", ")
            : "None specified"
        }
        Health Conditions: ${
          user.healthConditions && user.healthConditions.length > 0
            ? user.healthConditions.join(", ")
            : "None specified"
        }

        Based ONLY on the provided information, determine if this food is generally "good", "bad", or "neutral" for this user.
        - Prioritize allergies: If any listed food allergen matches a user allergy, suitability MUST be "bad". Check ingredients for potential hidden allergens if possible based on common names.
        - Consider health conditions:
            - If user has 'diabetes', flag foods very high in sugar or refined carbs as potentially "bad".
            - If user has 'high_cholesterol', flag foods potentially high in saturated/trans fats (infer if necessary, e.g., fried foods, fatty meats) as potentially "bad".
            - If user has 'hypertension' or 'high_blood_pressure', flag foods very high in sodium as potentially "bad".
        - If no strong conflicts exist, consider it "good" if it's generally nutritious (high fiber, protein, low sugar/sodium) or "neutral" otherwise (e.g., okay in moderation, processed snacks).

        Return ONLY a valid JSON object with the following structure (no markdown formatting, no extra text):
        {
          "suitability": "good" | "bad" | "neutral",
          "reason": "A brief, user-friendly explanation (1-2 sentences max) justifying the suitability based on the user's profile and the food's content. Mention specific conflicts like allergies or high sugar/sodium if applicable."
        }
        `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const advice = parseGeminiResponse(responseText); // Use existing parser

    if (
      advice &&
      ["good", "bad", "neutral"].includes(advice.suitability) &&
      advice.reason
    ) {
      return advice;
    } else {
      console.warn(
        "Failed to parse valid health advice from Gemini response:",
        responseText
      );
      return {
        suitability: "neutral",
        reason: "Could not automatically determine suitability.",
      };
    }
  } catch (err) {
    console.error("Gemini health advice error:", err.message);
    // Return a default neutral response in case of API error
    return {
      suitability: "neutral",
      reason: "Could not analyze health suitability due to an error.",
    };
  }
};

module.exports = exports;
