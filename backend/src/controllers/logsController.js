const FoodScan = require("../models/FoodScan");
const DailyLog = require("../models/DailyLog");
const User = require("../models/User");
const Food = require("../models/Food");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");

// Get daily summary
exports.getDailySummary = async (req, res) => {
  const t = await sequelize.transaction(); // Optional: Use a transaction for consistency
  try {
    const { date } = req.query;
    const userId = req.userId;
    const queryDate = date || new Date().toISOString().split("T")[0];

    // 1. Always fetch all scans for the user and date
    const scans = await FoodScan.findAll({
      where: { userId, scanDate: queryDate },
      include: [{ model: Food, as: "food" }],
      transaction: t, // Include in transaction
    });

    // 2. Calculate current totals based on fetched scans
    let currentTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      // Water intake might need separate handling if not derived from scans
    };

    const mealsBreakdown = {
      // Initialize meal breakdown structure
      breakfast: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      lunch: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      dinner: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      snack: { calories: 0, protein: 0, carbs: 0, fats: 0 },
    };

    scans.forEach((scan) => {
      // Ensure scan.food exists before accessing its properties
      if (!scan.food) {
        console.warn(`Scan ${scan.id} is missing associated food data.`);
        return; // Skip this scan if food data is missing
      }
      const multiplier = scan.quantityGrams / 100;
      const nutrition = {
        calories: Math.round((scan.food.caloriesPer100g || 0) * multiplier),
        protein: parseFloat(
          ((scan.food.proteinGrams || 0) * multiplier).toFixed(2)
        ),
        carbs: parseFloat(
          ((scan.food.carbsGrams || 0) * multiplier).toFixed(2)
        ),
        fats: parseFloat(((scan.food.fatsGrams || 0) * multiplier).toFixed(2)),
        fiber: parseFloat(
          ((scan.food.fiberGrams || 0) * multiplier).toFixed(2)
        ),
      };

      currentTotals.calories += nutrition.calories;
      currentTotals.protein += nutrition.protein;
      currentTotals.carbs += nutrition.carbs;
      currentTotals.fats += nutrition.fats;
      currentTotals.fiber += nutrition.fiber;

      // Accumulate meal breakdown
      if (mealsBreakdown[scan.mealType]) {
        mealsBreakdown[scan.mealType].calories += nutrition.calories;
        mealsBreakdown[scan.mealType].protein += nutrition.protein;
        mealsBreakdown[scan.mealType].carbs += nutrition.carbs;
        mealsBreakdown[scan.mealType].fats += nutrition.fats;
      }
    });

    // 3. Find or Create the DailyLog entry and Update it
    const [dailyLog, created] = await DailyLog.findOrCreate({
      where: { userId, date: queryDate },
      defaults: {
        userId,
        date: queryDate,
        totalCalories: currentTotals.calories,
        totalProtein: currentTotals.protein,
        totalCarbs: currentTotals.carbs,
        totalFats: currentTotals.fats,
        totalFiber: currentTotals.fiber,
        // waterIntakeMl: dailyLog?.waterIntakeMl || 0, // Preserve existing water or default to 0
        mealBreakdown: mealsBreakdown, // Store the calculated breakdown
      },
      transaction: t, // Include in transaction
    });

    // If the log already existed, update it with the fresh totals
    if (!created) {
      dailyLog.totalCalories = currentTotals.calories;
      dailyLog.totalProtein = currentTotals.protein;
      dailyLog.totalCarbs = currentTotals.carbs;
      dailyLog.totalFats = currentTotals.fats;
      dailyLog.totalFiber = currentTotals.fiber;
      // Note: Water intake needs separate update logic if it's logged independently
      // dailyLog.waterIntakeMl = updatedWaterIntake;
      dailyLog.mealBreakdown = mealsBreakdown; // Update meal breakdown too
      await dailyLog.save({ transaction: t }); // Save changes within transaction
    }

    // 4. Get user goals
    const user = await User.findByPk(userId, { transaction: t }); // Fetch user within transaction
    if (!user) {
      throw new Error("User not found"); // Should not happen if authMiddleware is working
    }

    await t.commit(); // Commit the transaction

    // 5. Return the updated summary
    return res.status(200).json({
      success: true,
      data: {
        date: queryDate,
        totals: {
          calories: dailyLog.totalCalories,
          protein: parseFloat(dailyLog.totalProtein.toFixed(1)), // Format output
          carbs: parseFloat(dailyLog.totalCarbs.toFixed(1)),
          fats: parseFloat(dailyLog.totalFats.toFixed(1)),
          fiber: parseFloat(dailyLog.totalFiber.toFixed(1)),
          water: dailyLog.waterIntakeMl, // Use the value from the log
        },
        goals: {
          calories: user.dailyCaloricGoal,
          protein: user.proteinGoalGrams,
          carbs: user.carbsGoalGrams,
          fats: user.fatsGoalGrams,
          water: user.waterIntakeGoalMl,
        },
        progress: {
          // Ensure goals are not zero before calculating percentage
          caloriePercent:
            user.dailyCaloricGoal > 0
              ? Math.round(
                  (dailyLog.totalCalories / user.dailyCaloricGoal) * 100
                )
              : 0,
          proteinPercent:
            user.proteinGoalGrams > 0
              ? Math.round(
                  (dailyLog.totalProtein / user.proteinGoalGrams) * 100
                )
              : 0,
          carbsPercent:
            user.carbsGoalGrams > 0
              ? Math.round((dailyLog.totalCarbs / user.carbsGoalGrams) * 100)
              : 0,
          fatsPercent:
            user.fatsGoalGrams > 0
              ? Math.round((dailyLog.totalFats / user.fatsGoalGrams) * 100)
              : 0,
        },
        // Optionally include mealsBreakdown if the frontend needs it
        mealBreakdown: dailyLog.mealBreakdown,
      },
    });
  } catch (err) {
    await t.rollback(); // Rollback transaction on error
    console.error("Get daily summary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily summary",
      error: err.message,
    });
  }
};

// Get weekly summary
exports.getWeeklySummary = async (req, res) => {
  try {
    const userId = req.userId;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    const logs = await DailyLog.findAll({
      where: {
        userId,
        date: {
          [Op.between]: [
            startDate.toISOString().split("T")[0],
            endDate.toISOString().split("T")[0],
          ],
        },
      },
      order: [["date", "ASC"]],
    });

    const dailyBreakdown = logs.map((log) => ({
      date: log.date,
      calories: log.totalCalories,
      protein: log.totalProtein,
      carbs: log.totalCarbs,
      fats: log.totalFats,
    }));

    const averages = {
      calories:
        logs.length > 0
          ? Math.round(
              logs.reduce((sum, l) => sum + l.totalCalories, 0) / logs.length
            )
          : 0,
      protein:
        logs.length > 0
          ? parseFloat(
              (
                logs.reduce((sum, l) => sum + l.totalProtein, 0) / logs.length
              ).toFixed(2)
            )
          : 0,
      carbs:
        logs.length > 0
          ? parseFloat(
              (
                logs.reduce((sum, l) => sum + l.totalCarbs, 0) / logs.length
              ).toFixed(2)
            )
          : 0,
      fats:
        logs.length > 0
          ? parseFloat(
              (
                logs.reduce((sum, l) => sum + l.totalFats, 0) / logs.length
              ).toFixed(2)
            )
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        period: `${startDate.toISOString().split("T")[0]} to ${
          endDate.toISOString().split("T")[0]
        }`,
        dailyBreakdown,
        averages,
      },
    });
  } catch (err) {
    console.error("Get weekly summary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch weekly summary",
      error: err.message,
    });
  }
};

// Remove food scan
exports.removeFoodScan = async (req, res) => {
  try {
    const { scanId } = req.params;
    const userId = req.userId;

    const scan = await FoodScan.findOne({
      where: { id: scanId, userId },
    });

    if (!scan) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    await scan.destroy();

    res.status(200).json({
      success: true,
      message: "Food scan removed successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to remove scan",
      error: err.message,
    });
  }
};
