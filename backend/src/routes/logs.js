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

// 🚨 THE FIXED WATER ROUTE 🚨
router.post("/water", async (req, res) => {
  try {
    const userId = req.userId;
    const { amountMl } = req.body;

    // We allow 0 so the reset works! Only block negative numbers or missing data.
    if (
      amountMl === undefined ||
      typeof amountMl !== "number" ||
      amountMl < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid amountMl is required.",
      });
    }

    const queryDate = new Date().toISOString().split("T")[0];

    // Look for today's log
    let dailyLog = await DailyLog.findOne({
      where: { userId, date: queryDate },
    });

    if (dailyLog) {
      // EXACT OVERRIDE: We replace the number, we do NOT increment it!
      dailyLog.waterIntakeMl = amountMl;
      await dailyLog.save();
    } else {
      // Create a new log if none exists today
      dailyLog = await DailyLog.create({
        userId,
        date: queryDate,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        totalFiber: 0,
        waterIntakeMl: amountMl,
      });
    }

    res.status(200).json({
      success: true,
      message: `Water updated to ${amountMl}ml.`,
      data: {
        date: queryDate,
        waterIntakeMl: dailyLog.waterIntakeMl,
      },
    });
  } catch (err) {
    console.error("Log water error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to log water intake",
      error: err.message,
    });
  }
});

module.exports = router;
