// backend/src/controllers/foodController.js
const Food = require("../models/Food");
const FoodScan = require("../models/FoodScan");
const User = require("../models/User");
const multer = require("multer");
const fs = require("fs"); // Ensure 'fs' is required
const path = require("path"); // Ensure 'path' is required
const geminiService = require("../services/geminiService.js");

// Note: Ensure the 'upload' middleware using multer.diskStorage is defined in your routes/food.js file

// Search food by name using Gemini
exports.searchFood = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters",
      });
    }

    // Use Gemini to search/suggest foods
    const foods = await geminiService.searchOrSuggestFood(query);

    res.status(200).json({
      success: true,
      data: foods,
    });
  } catch (err) {
    console.error("Search food error:", err);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: err.message,
    });
  }
};

// Get food details
exports.getFoodDetails = async (req, res) => {
  try {
    const { foodId } = req.params;

    const food = await Food.findByPk(foodId);
    if (!food) {
      return res.status(404).json({
        success: false,
        message: "Food not found",
      });
    }

    res.status(200).json({
      success: true,
      data: food,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch food details",
      error: err.message,
    });
  }
};

// Scan food from image using Gemini Vision
// Scan food from image using Gemini Vision (SINGLE-SHOT OPTIMIZED)
exports.scanFoodFromImage = async (req, res) => {
  const finalImagePath = req.file?.path;

  try {
    const { mealType, quantityGrams } = req.body;
    const userId = req.userId;

    if (!req.file || !mealType || !quantityGrams) {
      if (finalImagePath && fs.existsSync(finalImagePath))
        fs.unlinkSync(finalImagePath);
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields or image" });
    }

    const imageFileName = req.file.filename;

    // 🚨 1. FETCH THE USER FIRST so we can send their profile to the AI
    const user = await User.findByPk(userId);
    if (!user) {
      if (fs.existsSync(finalImagePath)) fs.unlinkSync(finalImagePath);
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const imageBuffer = fs.readFileSync(finalImagePath);
    const mimeType = req.file.mimetype;

    // 🚨 2. SINGLE API CALL: Pass the user into the scanner!
    const nutritionData = await geminiService.getFoodNutritionFromImage(
      imageBuffer,
      mimeType,
      user,
    );

    if (
      !nutritionData ||
      !nutritionData.foodName ||
      nutritionData.foodName.toLowerCase().includes("not found")
    ) {
      if (fs.existsSync(finalImagePath)) fs.unlinkSync(finalImagePath);
      return res
        .status(400)
        .json({
          success: false,
          message: "Could not detect food.",
          data: { scan: null },
        });
    }

    // Create or fetch food
    const food = await geminiService.createOrFetchFood(nutritionData);
    const imageUrl = `/uploads/${imageFileName}`;
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies,
    );

    // 🚨 3. WE DELETED THE SECOND API CALL (`getHealthAdvice`).
    // We just read the data directly from `nutritionData`!

    // Create scan record
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams: quantityGrams || nutritionData.estimatedQuantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      scannedAt: new Date(),
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: nutritionData.confidence || 0.9,
      imageUrl: imageUrl,
      healthSuitability: nutritionData.suitability || "neutral", // <-- From single shot!
      healthReason: nutritionData.reason || "Analysis complete.", // <-- From single shot!
    });

    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      scan.quantityGrams,
    );

    res.status(201).json({
      success: true,
      message: "Food scanned successfully",
      data: { scan: { ...scan.toJSON(), food: food.toJSON(), nutrition } },
    });
  } catch (err) {
    if (finalImagePath && fs.existsSync(finalImagePath))
      fs.unlinkSync(finalImagePath);
    console.error("Scan food from image error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: err.message || "Failed to scan food",
        error: err.toString(),
      });
  }
};

// Scan food by text using Gemini (FIXED CACHING)
exports.scanFoodByText = async (req, res) => {
  try {
    const { foodName, quantityGrams, mealType } = req.body;
    const userId = req.userId;

    if (!foodName || !quantityGrams || !mealType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const user = await User.findByPk(userId);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "User not found" });

    // 🚨 1. CHECK THE CACHE FIRST!
    const { Op } = require("sequelize");
    let food = await Food.findOne({
      where: { name: { [Op.iLike]: foodName } }, // Case-insensitive exact match
    });

    // 🚨 2. ONLY CALL AI IF IT'S A CACHE MISS
    if (!food) {
      console.log(`Cache miss for "${foodName}". Asking AI Chef...`);
      const nutritionData =
        await geminiService.getFoodNutritionFromText(foodName);

      if (
        !nutritionData ||
        !nutritionData.foodName ||
        nutritionData.foodName.toLowerCase().includes("not found")
      ) {
        return res.status(400).json({
          success: false,
          message: `Could not find info for "${foodName}".`,
          data: { scan: null },
        });
      }
      // Save the new AI result to the database cache
      food = await geminiService.createOrFetchFood(nutritionData);
    } else {
      console.log(
        `Cache Hit! Loaded "${foodName}" instantly from local database.`,
      );
    }

    // Detect allergens & Health Advice
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies,
    );
    const healthAdvice = await geminiService.getHealthAdvice(food, user);

    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      scannedAt: new Date(),
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: 0.99, // Cache/Text searches are high confidence
      healthSuitability: healthAdvice?.suitability || null,
      healthReason: healthAdvice?.reason || null,
    });

    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      quantityGrams,
    );

    res.status(201).json({
      success: true,
      message: "Food scanned successfully",
      data: { scan: { ...scan.toJSON(), food: food.toJSON(), nutrition } },
    });
  } catch (err) {
    console.error("Scan food by text error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to scan food",
      error: err.message,
    });
  }
};

// Manual food entry
exports.manualFoodEntry = async (req, res) => {
  try {
    const {
      foodName,
      quantityGrams,
      mealType,
      caloriesPer100g,
      proteinGrams,
      carbsGrams,
      fatsGrams,
      // Add other optional nutrients if your form supports them
      fiberGrams,
      sugarGrams,
      sodiumMg,
    } = req.body;
    const userId = req.userId;

    if (!foodName || !quantityGrams || !mealType || !caloriesPer100g) {
      return res.status(400).json({
        success: false,
        message:
          "foodName, quantityGrams, mealType, and caloriesPer100g are required",
      });
    }

    // Get user to potentially check allergens/conditions later if needed for advice
    const user = await User.findByPk(userId);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Create food object for service
    const foodDataForService = {
      foodName,
      category: "other", // Or derive category if possible
      caloriesPer100g,
      proteinGrams: proteinGrams || 0,
      carbsGrams: carbsGrams || 0,
      fatsGrams: fatsGrams || 0,
      fiberGrams: fiberGrams || 0,
      sugarGrams: sugarGrams || 0,
      sodiumMg: sodiumMg || 0,
      source: "user_input",
      allergens: [], // User input might not specify allergens/ingredients
      ingredients: [],
    };

    // Create or fetch food (using user_input source)
    const food = await geminiService.createOrFetchFood(foodDataForService);

    // Optionally generate health advice even for manual entries
    const healthAdvice = await geminiService.getHealthAdvice(food, user);

    // Create scan
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      scannedAt: new Date(), // <-- Added scannedAt
      // You might not have detected allergens/warnings for manual entry
      detectedAllergens: [],
      allergenWarning: false,
      confidenceScore: 1.0, // Manual entry = 100% confidence
      healthSuitability: healthAdvice?.suitability || null, // Save advice if generated
      healthReason: healthAdvice?.reason || null,
    });

    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      quantityGrams,
    );

    res.status(201).json({
      success: true,
      message: "Food entry created successfully",
      data: {
        scan: {
          ...scan.toJSON(),
          food: food.toJSON(), // Send back the created/fetched food details
          nutrition: nutrition,
        },
      },
    });
  } catch (err) {
    console.error("Manual food entry error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create food entry",
      error: err.message,
    });
  }
};
exports.scanBarcode = async (req, res) => {
  try {
    const { barcode, mealType, quantityGrams } = req.body;
    console.log(`\n--- INITIATING BARCODE SCAN: ${barcode} ---`);

    const Food = require("../models/Food");
    const FoodScan = require("../models/FoodScan");
    const User = require("../models/User"); // Required for fetching profile

    // ==========================================
    // TIER 1: Check Local Database
    // ==========================================
    let food = await Food.findOne({ where: { barcode: barcode } });
    if (food) console.log("SUCCESS (Tier 1): Found in local database.");

    // ==========================================
    // TIER 2: Open Food Facts
    // ==========================================
    if (!food) {
      console.log("Not local. Checking Tier 2: Open Food Facts...");
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      );
      const offData = await offResponse.json();

      if (offData.status === 1) {
        const product = offData.product;
        const nutriments = product.nutriments || {};

        food = await Food.create({
          name: product.product_name || "Unknown Packaged Food",
          caloriesPer100g: nutriments["energy-kcal_100g"] || 0,
          proteinGrams: nutriments.proteins_100g || 0,
          carbsGrams: nutriments.carbohydrates_100g || 0,
          fatsGrams: nutriments.fat_100g || 0,
          fiberGrams: nutriments.fiber_100g || 0,
          sugarGrams: nutriments.sugars_100g || 0,
          sodiumMg: (nutriments.sodium_100g || 0) * 1000,
          allergens: product.allergens_tags
            ? product.allergens_tags.map((a) => a.replace("en:", ""))
            : [],
          category: "other",
          barcode: barcode,
          imageUrl: product.image_url || null,
          source: "manual",
        });
        console.log("SUCCESS (Tier 2): Found in Open Food Facts.");
      }
    }

    // ==========================================
    // TIER 3: UPCitemdb + AI Bridge
    // ==========================================
    if (!food) {
      console.log("Not in OFF. Checking Tier 3: UPCitemdb + AI Bridge...");
      const upcResponse = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      );
      const upcData = await upcResponse.json();

      if (upcData.items && upcData.items.length > 0) {
        const productName = upcData.items[0].title;
        console.log(`UPC Match: "${productName}". Asking AI for macros...`);

        try {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          // NEW: Force strict JSON format to prevent parsing crashes
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" },
          });

          const prompt = `Estimate the average nutritional values per 100 grams for "${productName}". 
          Format strictly as: {"caloriesPer100g": number, "proteinGrams": number, "carbsGrams": number, "fatsGrams": number, "sugarGrams": number, "fiberGrams": number, "sodiumMg": number}`;

          const aiResult = await model.generateContent(prompt);
          const estimatedMacros = JSON.parse(aiResult.response.text());

          food = await Food.create({
            name: productName,
            caloriesPer100g: estimatedMacros.caloriesPer100g || 0,
            proteinGrams: estimatedMacros.proteinGrams || 0,
            carbsGrams: estimatedMacros.carbsGrams || 0,
            fatsGrams: estimatedMacros.fatsGrams || 0,
            fiberGrams: estimatedMacros.fiberGrams || 0,
            sugarGrams: estimatedMacros.sugarGrams || 0,
            sodiumMg: estimatedMacros.sodiumMg || 0,
            allergens: [],
            category: "other",
            barcode: barcode,
            imageUrl: upcData.items[0].images?.[0] || null,
            source: "gemini",
          });
          console.log("SUCCESS (Tier 3): AI estimated macros.");
        } catch (aiError) {
          console.error("AI Bridge failed.", aiError);
          food = await Food.create({
            name: productName,
            category: "other",
            barcode: barcode,
            caloriesPer100g: 0,
            proteinGrams: 0,
            carbsGrams: 0,
            fatsGrams: 0,
            source: "manual",
          });
        }
      }
    }

    // ==========================================
    // TIER 4: Ultimate Failure
    // ==========================================
    if (!food) {
      console.log("FAILURE: Barcode not found.");
      return res.status(404).json({
        success: false,
        message:
          "Barcode not found. Try snapping a photo of the nutrition label using AI Vision!",
      });
    }

    // ==========================================
    // TIER 5: AI Health Evaluation (Personalized)
    // ==========================================
    let healthSuitability = "neutral";
    let healthReason = "Verified packaged food.";

    try {
      console.log("Evaluating personalized health suitability...");
      const currentUser = await User.findByPk(req.user.id);

      if (currentUser) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // NEW: Force strict JSON format here too!
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" },
        });

        const userProfile = `Allergies: ${(currentUser.allergies || []).join(", ") || "None"}. Health Conditions: ${(currentUser.healthConditions || []).join(", ") || "None"}. Dietary Preferences: ${(currentUser.dietaryPreferences || []).join(", ") || "None"}`;

        const prompt = `You are a nutritionist. Evaluate if "${food.name}" (a packaged food with ${food.caloriesPer100g}kcal, ${food.sugarGrams}g sugar, ${food.sodiumMg}mg sodium per 100g) is suitable for a user with the following profile: ${userProfile}. 
        Format exactly like this: {"suitability": "good" | "neutral" | "warning", "reason": "One short sentence explaining why."}`;

        const aiResult = await model.generateContent(prompt);
        const healthData = JSON.parse(aiResult.response.text());

        healthSuitability = healthData.suitability || "neutral";
        healthReason = healthData.reason || "Analysis complete.";
        console.log(
          "SUCCESS (Tier 5): AI Health Insight generated ->",
          healthReason,
        );
      }
    } catch (error) {
      console.error("Health evaluation AI failed:", error.message);
    }

    // Save to history
    const scan = await FoodScan.create({
      userId: req.user.id,
      foodId: food.id,
      mealType,
      quantityGrams,
      healthSuitability: healthSuitability,
      healthReason: healthReason,
      imageUrl: food.imageUrl,
    });

    // Return ALL macros to frontend
    res.json({
      success: true,
      data: {
        scan: {
          ...scan.toJSON(),
          food: food.toJSON(),
          nutrition: {
            calories: Math.round(
              (food.caloriesPer100g || 0) * (quantityGrams / 100),
            ),
            protein: ((food.proteinGrams || 0) * (quantityGrams / 100)).toFixed(
              1,
            ),
            carbs: ((food.carbsGrams || 0) * (quantityGrams / 100)).toFixed(1),
            fats: ((food.fatsGrams || 0) * (quantityGrams / 100)).toFixed(1),
            fiber: ((food.fiberGrams || 0) * (quantityGrams / 100)).toFixed(1),
            sugar: ((food.sugarGrams || 0) * (quantityGrams / 100)).toFixed(1),
            sodium: ((food.sodiumMg || 0) * (quantityGrams / 100)).toFixed(1),
          },
          imageUrl: food.imageUrl,
        },
      },
    });
  } catch (error) {
    console.error("Barcode Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error processing barcode." });
  }
};
