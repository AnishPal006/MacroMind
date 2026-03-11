const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  searchFood,
  getFoodDetails,
  scanFoodFromImage,
  scanFoodByText,
  manualFoodEntry,
  scanBarcode, // <-- ADDED: Imported the new scanBarcode function
} = require("../controllers/foodController");
const { authMiddleware } = require("../middleware/auth");
const Food = require("../models/Food");
const User = require("../models/User");
const geminiService = require("../services/geminiService.js");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "..", "uploads");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    const finalFilename = `${uniqueSuffix}-${safeOriginalName}`;
    cb(null, finalFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Public routes
router.get("/search", searchFood);
router.get("/:foodId", getFoodDetails);

// Protected routes (Everything below this line automatically requires authentication)
router.use(authMiddleware);

// Image-based scanning
router.post("/scan-image", upload.single("image"), scanFoodFromImage);

// Text-based scanning
router.post("/scan", scanFoodByText);

// Manual entry
router.post("/manual-entry", manualFoodEntry);

// Barcode scanning
router.post("/scan-barcode", scanBarcode); // <-- FIXED: Removed "auth" and "foodController."

module.exports = router;
