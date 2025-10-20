const express = require("express");
const multer = require("multer");
const {
  searchFood,
  getFoodDetails,
  scanFoodFromImage,
  scanFoodByText,
  manualFoodEntry,
} = require("../controllers/foodController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

// Public routes
router.get("/search", searchFood);
router.get("/:foodId", getFoodDetails);

// Protected routes
router.use(authMiddleware);

// Image-based scanning
router.post("/scan-image", upload.single("image"), scanFoodFromImage);

// Text-based scanning
router.post("/scan", scanFoodByText);

// Manual entry
router.post("/manual-entry", manualFoodEntry);

module.exports = router;
