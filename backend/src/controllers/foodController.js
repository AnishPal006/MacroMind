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
exports.scanFoodFromImage = async (req, res) => {
  // Define path early for potential cleanup, now points to final location
  const finalImagePath = req.file?.path;

  try {
    const { mealType, quantityGrams } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Image file is required" });
    }

    // *** Get filename from req.file (set by multer.diskStorage) ***
    const imageFileName = req.file.filename; // <-- Use this

    if (!mealType || !quantityGrams) {
      // Clean up the SAVED file if validation fails
      if (finalImagePath && fs.existsSync(finalImagePath)) {
        try {
          fs.unlinkSync(finalImagePath);
        } catch (e) {
          console.error("Error cleaning up image on validation fail:", e);
        }
      }
      return res.status(400).json({
        success: false,
        message: "mealType and quantityGrams are required",
      });
    }

    // Read image file using the final path
    const imageBuffer = fs.readFileSync(finalImagePath);
    const mimeType = req.file.mimetype;

    // Get nutrition data from Gemini Vision
    const nutritionData = await geminiService.getFoodNutritionFromImage(
      imageBuffer,
      mimeType
    );

    if (
      !nutritionData ||
      !nutritionData.foodName ||
      nutritionData.foodName.toLowerCase().includes("not found")
    ) {
      console.log("Gemini failed to detect food from image.");
      // Clean up the saved image file as it's not needed
      if (fs.existsSync(finalImagePath)) fs.unlinkSync(finalImagePath);
      // Return a specific failure message
      return res.status(400).json({
        success: false,
        message:
          "Could not detect a food item in the image. Please try again with a clearer picture.",
        data: { scan: null }, // Explicitly null data
      });
    }

    // Get user for allergen checking
    const user = await User.findByPk(userId);
    if (!user) {
      // Clean up saved file if user not found
      if (fs.existsSync(finalImagePath)) fs.unlinkSync(finalImagePath);
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Create or fetch food
    const food = await geminiService.createOrFetchFood(nutritionData);

    // *** REMOVED manual rename logic and redundant imageFileName declaration ***

    // Construct imageUrl using the filename from req.file
    const imageUrl = `/uploads/${imageFileName}`; // Relative URL path for serving

    // Detect allergens
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies
    );

    // Get health advice
    const healthAdvice = await geminiService.getHealthAdvice(food, user);

    // Create scan record
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams: quantityGrams || nutritionData.estimatedQuantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      scannedAt: new Date(), // <-- Added scannedAt for better sorting
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: nutritionData.confidence || 0.9,
      imageUrl: imageUrl,
      healthSuitability: healthAdvice?.suitability || null,
      healthReason: healthAdvice?.reason || null,
    });

    // Calculate nutrition for this quantity
    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      scan.quantityGrams // Use the actual saved quantity
    );

    // *** No need to manually delete finalImagePath here unless scan creation fails ***

    res.status(201).json({
      success: true,
      message: "Food scanned successfully",
      data: {
        scan: {
          ...scan.toJSON(),
          food: food.toJSON(),
          nutrition: nutrition,
          // healthAdvice is now part of scan.toJSON()
        },
      },
    });
  } catch (err) {
    // Clean up the SAVED file on error if it exists
    if (finalImagePath && fs.existsSync(finalImagePath)) {
      try {
        fs.unlinkSync(finalImagePath);
        console.log("Cleaned up saved image file after error:", finalImagePath);
      } catch (cleanupErr) {
        console.error("Error cleaning up image file:", cleanupErr);
      }
    }
    console.error("Scan food from image error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to scan food",
      error: err.toString(),
    });
  }
};

// Scan food by text using Gemini
exports.scanFoodByText = async (req, res) => {
  try {
    const { foodName, quantityGrams, mealType } = req.body;
    const userId = req.userId;

    if (!foodName || !quantityGrams || !mealType) {
      return res.status(400).json({
        success: false,
        message: "foodName, quantityGrams, and mealType are required",
      });
    }

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      // Added check for user existence
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    // Get nutrition info from Gemini
    const nutritionData = await geminiService.getFoodNutritionFromText(
      foodName
    );

    if (
      !nutritionData ||
      !nutritionData.foodName ||
      nutritionData.foodName.toLowerCase().includes("not found")
    ) {
      console.log("Gemini failed to find nutrition data for text:", foodName);
      return res.status(400).json({
        success: false,
        message: `Could not find nutritional information for "${foodName}". Please try a different name.`,
        data: { scan: null }, // Explicitly null data
      });
    }

    // Create or fetch food
    const food = await geminiService.createOrFetchFood(nutritionData);

    // Detect allergens
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies
    );

    // Get health advice
    const healthAdvice = await geminiService.getHealthAdvice(food, user);

    // Create scan record
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      scannedAt: new Date(), // <-- Added scannedAt
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: nutritionData.confidence || 0.85,
      // Add the health advice fields
      healthSuitability: healthAdvice?.suitability || null,
      healthReason: healthAdvice?.reason || null,
    });

    // Calculate nutrition for this quantity
    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      quantityGrams
    );

    res.status(201).json({
      success: true,
      message: "Food scanned successfully",
      data: {
        scan: {
          ...scan.toJSON(),
          food: food.toJSON(),
          nutrition: nutrition,
        },
      },
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
      quantityGrams
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
