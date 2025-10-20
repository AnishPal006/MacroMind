const Food = require("../models/Food");
const FoodScan = require("../models/FoodScan");
const User = require("../models/User");
const multer = require("multer");
const fs = require("fs");
const geminiService = require("../services/geminiService.js");

// Configure multer for image uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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
  try {
    const { mealType, quantityGrams } = req.body;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    if (!mealType || !quantityGrams) {
      fs.unlinkSync(req.file.path); // Clean up uploaded file
      return res.status(400).json({
        success: false,
        message: "mealType and quantityGrams are required",
      });
    }

    // Read image file
    const imageBuffer = fs.readFileSync(req.file.path);
    const mimeType = req.file.mimetype;

    // Get nutrition data from Gemini Vision
    const nutritionData = await geminiService.getFoodNutritionFromImage(
      imageBuffer,
      mimeType
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Get user for allergen checking
    const user = await User.findByPk(userId);

    // Create or fetch food
    const food = await geminiService.createOrFetchFood(nutritionData);

    // Detect allergens
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies
    );

    // Create scan record
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams: quantityGrams || nutritionData.estimatedQuantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: nutritionData.confidence || 0.9,
    });

    // Calculate nutrition for this quantity
    const nutrition = geminiService.calculateNutritionForQuantity(
      food,
      quantityGrams || nutritionData.estimatedQuantityGrams
    );

    res.status(201).json({
      success: true,
      message: "Food scanned successfully",
      data: {
        scan: {
          id: scan.id,
          food: food.toJSON(),
          quantity: quantityGrams || nutritionData.estimatedQuantityGrams,
          mealType,
          nutrition,
          allergenWarning: allergenDetection.hasAllergen,
          detectedAllergens: allergenDetection.detectedAllergens,
          confidence: nutritionData.confidence,
        },
      },
    });
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Scan food from image error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to scan food",
      error: err.message,
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

    // Get nutrition info from Gemini
    const nutritionData = await geminiService.getFoodNutritionFromText(
      foodName
    );

    // Create or fetch food
    const food = await geminiService.createOrFetchFood(nutritionData);

    // Detect allergens
    const allergenDetection = await geminiService.detectAllergens(
      food.id,
      user.allergies
    );

    // Create scan record
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
      detectedAllergens: allergenDetection.detectedAllergens,
      allergenWarning: allergenDetection.hasAllergen,
      confidenceScore: nutritionData.confidence || 0.85,
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
          id: scan.id,
          food: food.toJSON(),
          quantityGrams,
          mealType,
          nutrition,
          allergenWarning: allergenDetection.hasAllergen,
          detectedAllergens: allergenDetection.detectedAllergens,
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
    } = req.body;
    const userId = req.userId;

    if (!foodName || !quantityGrams || !mealType || !caloriesPer100g) {
      return res.status(400).json({
        success: false,
        message:
          "foodName, quantityGrams, mealType, and caloriesPer100g are required",
      });
    }

    // Create food
    const food = await geminiService.createOrFetchFood({
      foodName,
      caloriesPer100g,
      proteinGrams: proteinGrams || 0,
      carbsGrams: carbsGrams || 0,
      fatsGrams: fatsGrams || 0,
      source: "user_input",
    });

    // Create scan
    const scan = await FoodScan.create({
      userId,
      foodId: food.id,
      quantityGrams,
      mealType,
      scanDate: new Date().toISOString().split("T")[0],
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
          id: scan.id,
          food,
          quantityGrams,
          mealType,
          nutrition,
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
