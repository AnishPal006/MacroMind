const User = require("../models/User");

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    res.status(200).json({
      success: true,
      data: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: err.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      age,
      gender,
      healthConditions,
      allergies,
      dietaryPreferences,
    } = req.body;

    const user = await User.findByPk(req.userId);

    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (age) user.age = age;
    if (gender) user.gender = gender;
    if (healthConditions) user.healthConditions = healthConditions;
    if (allergies) user.allergies = allergies;
    if (dietaryPreferences) user.dietaryPreferences = dietaryPreferences;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user.toJSON(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: err.message,
    });
  }
};

// Update nutrition goals
exports.updateGoals = async (req, res) => {
  try {
    const {
      dailyCaloricGoal,
      proteinGoalGrams,
      carbsGoalGrams,
      fatsGoalGrams,
      waterIntakeGoalMl,
    } = req.body;

    const user = await User.findByPk(req.userId);

    if (dailyCaloricGoal) user.dailyCaloricGoal = dailyCaloricGoal;
    if (proteinGoalGrams) user.proteinGoalGrams = proteinGoalGrams;
    if (carbsGoalGrams) user.carbsGoalGrams = carbsGoalGrams;
    if (fatsGoalGrams) user.fatsGoalGrams = fatsGoalGrams;
    if (waterIntakeGoalMl) user.waterIntakeGoalMl = waterIntakeGoalMl;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Goals updated successfully",
      data: {
        dailyCaloricGoal: user.dailyCaloricGoal,
        proteinGoalGrams: user.proteinGoalGrams,
        carbsGoalGrams: user.carbsGoalGrams,
        fatsGoalGrams: user.fatsGoalGrams,
        waterIntakeGoalMl: user.waterIntakeGoalMl,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update goals",
      error: err.message,
    });
  }
};

// Get user goals
exports.getGoals = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    res.status(200).json({
      success: true,
      data: {
        dailyCaloricGoal: user.dailyCaloricGoal,
        proteinGoalGrams: user.proteinGoalGrams,
        carbsGoalGrams: user.carbsGoalGrams,
        fatsGoalGrams: user.fatsGoalGrams,
        waterIntakeGoalMl: user.waterIntakeGoalMl,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch goals",
      error: err.message,
    });
  }
};
