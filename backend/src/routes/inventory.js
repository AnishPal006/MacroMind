const express = require("express");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// Placeholder routes
router.post("/add", (req, res) => {
  res.json({ success: true, message: "Inventory feature coming soon" });
});

router.get("/all", (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;
