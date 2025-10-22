const express = require("express");
const { Op } = require("sequelize");
const FoodScan = require("../models/FoodScan");
const Food = require("../models/Food");
const User = require("../models/User");
const DailyLog = require("../models/DailyLog");
const {
  getDailySummary,
  getWeeklySummary,
  removeFoodScan,
} = require("../controllers/logsController");
const { authMiddleware } = require("../middleware/auth");
const { sequelize } = require("../config/database");

const router = express.Router();

// All logs routes are protected
router.use(authMiddleware);

// Get daily summary
router.get("/daily", getDailySummary);

// Get weekly summary
router.get("/weekly", getWeeklySummary);

// Get food scans with optional date filter
router.get("/scans", async (req, res) => {
  try {
    const { date } = req.query;
    const userId = req.userId;

    let whereClause = { userId };

    if (date) {
      whereClause.scanDate = date;
    } else {
      // Default to last 30 days if no date specified
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.scanDate = {
        [Op.gte]: thirtyDaysAgo.toISOString().split("T")[0],
      };
    }

    const scans = await FoodScan.findAll({
      where: whereClause,
      include: [
        {
          model: Food,
          as: "food",
          attributes: [
            "id",
            "name",
            "category",
            "caloriesPer100g",
            "proteinGrams",
            "carbsGrams",
            "fatsGrams",
            "fiberGrams",
            "sugarGrams",
            "sodiumMg",
            "allergens",
          ],
        },
      ],
      order: [["scannedAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: scans,
    });
  } catch (err) {
    console.error("Get food scans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch food scans",
      error: err.message,
    });
  }
});

// Remove food scan
router.delete("/scan/:scanId", removeFoodScan);

router.post("/water", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { amountMl } = req.body; // Amount to add (e.g., 250, 500)
    const userId = req.userId;
    const queryDate = new Date().toISOString().split("T")[0]; // Always log for today

    if (!amountMl || typeof amountMl !== "number" || amountMl <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid amountMl (positive number) is required.",
        });
    }

    // Find or create today's log entry
    const [dailyLog, created] = await DailyLog.findOrCreate({
      where: { userId, date: queryDate },
      defaults: {
        userId,
        date: queryDate,
        waterIntakeMl: amountMl, // Start with the added amount if creating
        // Initialize other fields if needed, copying defaults from the model
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        totalFiber: 0,
        goalMet: false,
        mealBreakdown: {
          /* default breakdown structure */
        },
      },
      transaction: t,
    });

    // If the log already existed, increment the water intake
    if (!created) {
      // Use Sequelize's increment method for atomic update
      await dailyLog.increment("waterIntakeMl", {
        by: amountMl,
        transaction: t,
      });
      // Reload the instance to get the updated value
      await dailyLog.reload({ transaction: t });
    }

    await t.commit();

    // Return the updated water intake for the day
    res.status(200).json({
      success: true,
      message: `Added ${amountMl}ml of water.`,
      data: {
        date: queryDate,
        waterIntakeMl: dailyLog.waterIntakeMl, // Send back the new total
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("Log water error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to log water intake",
        error: err.message,
      });
  }
});

module.exports = router;
