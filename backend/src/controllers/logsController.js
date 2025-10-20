const FoodScan = require("../models/FoodScan");
const DailyLog = require("../models/DailyLog");
const User = require("../models/User");
const Food = require("../models/Food");
const { Op } = require("sequelize");

// Get daily summary
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.userId;
    const queryDate = date || new Date().toISOString().split("T")[0];

    // Get or create daily log
    let dailyLog = await DailyLog.findOne({
      where: { userId, date: queryDate },
    });

    if (!dailyLog) {
      // Fetch scans for this date and calculate totals
      const scans = await FoodScan.findAll({
        where: { userId, scanDate: queryDate },
        include: [{ model: Food, as: "food" }],
      });

      if (scans.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            date: queryDate,
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFats: 0,
            waterIntakeMl: 0,
            meals: {
              breakfast: [],
              lunch: [],
              dinner: [],
              snack: [],
            },
            summary: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fats: 0,
            },
          },
        });
      }

      // Calculate totals
      let totals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
        fiber: 0,
      };

      const meals = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      };

      scans.forEach((scan) => {
        const multiplier = scan.quantityGrams / 100;
        const nutrition = {
          calories: Math.round(scan.food.caloriesPer100g * multiplier),
          protein: parseFloat((scan.food.proteinGrams * multiplier).toFixed(2)),
          carbs: parseFloat((scan.food.carbsGrams * multiplier).toFixed(2)),
          fats: parseFloat((scan.food.fatsGrams * multiplier).toFixed(2)),
          fiber: parseFloat((scan.food.fiberGrams * multiplier).toFixed(2)),
        };

        totals.calories += nutrition.calories;
        totals.protein += nutrition.protein;
        totals.carbs += nutrition.carbs;
        totals.fats += nutrition.fats;
        totals.fiber += nutrition.fiber;

        meals[scan.mealType].push({
          id: scan.id,
          food: scan.food.name,
          quantity: scan.quantityGrams,
          nutrition,
          allergenWarning: scan.allergenWarning,
        });
      });

      // Create daily log record
      dailyLog = await DailyLog.create({
        userId,
        date: queryDate,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFats: totals.fats,
        totalFiber: totals.fiber,
      });
    }

    // Get user goals
    const user = await User.findByPk(userId);

    return res.status(200).json({
      success: true,
      data: {
        date: queryDate,
        totals: {
          calories: dailyLog.totalCalories,
          protein: dailyLog.totalProtein,
          carbs: dailyLog.totalCarbs,
          fats: dailyLog.totalFats,
          fiber: dailyLog.totalFiber,
          water: dailyLog.waterIntakeMl,
        },
        goals: {
          calories: user.dailyCaloricGoal,
          protein: user.proteinGoalGrams,
          carbs: user.carbsGoalGrams,
          fats: user.fatsGoalGrams,
          water: user.waterIntakeGoalMl,
        },
        progress: {
          caloriePercent: Math.round(
            (dailyLog.totalCalories / user.dailyCaloricGoal) * 100
          ),
          proteinPercent: Math.round(
            (dailyLog.totalProtein / user.proteinGoalGrams) * 100
          ),
          carbsPercent: Math.round(
            (dailyLog.totalCarbs / user.carbsGoalGrams) * 100
          ),
          fatsPercent: Math.round(
            (dailyLog.totalFats / user.fatsGoalGrams) * 100
          ),
        },
      },
    });
  } catch (err) {
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
