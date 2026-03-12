const User = require("../models/User");
const { generateToken } = require("../middleware/auth");

// Register new user
exports.register = async (req, res) => {
  try {
    // Destructure new fields from req.body
    const {
      email,
      password,
      fullName,
      age,
      gender,
      allergies,
      healthConditions,
    } = req.body;

    // Keep existing validation
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and full name are required",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      fullName,
      age,
      gender,
      // Assign the arrays received from the frontend
      allergies: allergies || [], // Ensure it's an array, default empty
      healthConditions: healthConditions || [], // Ensure it's an array, default empty
      // Keep default goals
      dailyCaloricGoal: 2000,
      proteinGoalGrams: 50,
      carbsGoalGrams: 250,
      fatsGoalGrams: 65,
      waterIntakeGoalMl: 2000,
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: user.toJSON(), // toJSON already removes password
        token,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: err.message, // Provide error message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: err.message,
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: err.message,
    });
  }
};

// Update current user
// Update current user
exports.updateCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = req.body;

    console.log("\n=== INCOMING PROFILE UPDATE ===");
    console.log("Received Payload:", updateData);

    const User = require("../models/User");
    const user = await User.findByPk(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 1. Direct Assignment for Text/Arrays
    if (updateData.fullName) user.fullName = updateData.fullName;
    if (updateData.allergies) user.allergies = updateData.allergies;
    if (updateData.healthConditions)
      user.healthConditions = updateData.healthConditions;
    if (updateData.dietaryPreferences)
      user.dietaryPreferences = updateData.dietaryPreferences;

    // 2. Force strict Number casting for dietary goals
    if (updateData.dailyCaloricGoal)
      user.dailyCaloricGoal = Number(updateData.dailyCaloricGoal);
    if (updateData.proteinGoalGrams)
      user.proteinGoalGrams = Number(updateData.proteinGoalGrams);
    if (updateData.carbsGoalGrams)
      user.carbsGoalGrams = Number(updateData.carbsGoalGrams);
    if (updateData.fatsGoalGrams)
      user.fatsGoalGrams = Number(updateData.fatsGoalGrams);
    if (updateData.waterIntakeGoalMl)
      user.waterIntakeGoalMl = Number(updateData.waterIntakeGoalMl);

    console.log("Saving these exact numbers to PostgreSQL:", {
      calories: user.dailyCaloricGoal,
      protein: user.proteinGoalGrams,
      carbs: user.carbsGoalGrams,
      fats: user.fatsGoalGrams,
    });

    // 3. Save and force a hard reload from the database
    await user.save();
    await user.reload();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user.toJSON(),
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: err.message,
    });
  }
};
