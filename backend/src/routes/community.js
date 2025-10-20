const express = require("express");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

// Placeholder routes
router.post("/posts", (req, res) => {
  res.json({ success: true, message: "Community feature coming soon" });
});

router.get("/feed", (req, res) => {
  res.json({ success: true, data: [] });
});

module.exports = router;
