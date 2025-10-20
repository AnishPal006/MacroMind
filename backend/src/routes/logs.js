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
            "allergens",
          ],
        },
      ],
      order: [["scanDate", "DESC"]],
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

module.exports = router;
