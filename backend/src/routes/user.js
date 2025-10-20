const express = require("express");
const {
  getProfile,
  updateProfile,
  updateGoals,
  getGoals,
} = require("../controllers/userController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// All user routes are protected
router.use(authMiddleware);

// Profile routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Goals routes
router.get("/goals", getGoals);
router.put("/goals", updateGoals);

module.exports = router;
