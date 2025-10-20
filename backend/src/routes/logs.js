const express = require("express");
const {
  getDailySummary,
  getWeeklySummary,
  removeFoodScan,
} = require("../controllers/logsController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// All logs routes are protected
router.use(authMiddleware);

router.get("/daily", getDailySummary);
router.get("/weekly", getWeeklySummary);
router.delete("/scan/:scanId", removeFoodScan);

module.exports = router;
