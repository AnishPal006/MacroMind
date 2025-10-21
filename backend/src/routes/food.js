const express = require("express");
const multer = require("multer");
const path = require("path"); // <-- Import path
const fs = require("fs"); // <-- Import fs
const {
  searchFood,
  getFoodDetails,
  scanFoodFromImage,
  scanFoodByText,
  manualFoodEntry,
} = require("../controllers/foodController");
const { authMiddleware } = require("../middleware/auth");
const Food = require("../models/Food"); // <-- Import Food model
const User = require("../models/User"); // <-- Import User model
const geminiService = require("../services/geminiService.js"); // <-- Import geminiService

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "..", "..", "uploads"); // Correct path relative to src/routes
    // Ensure the directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath); // Save files to the 'uploads' directory at the backend root
  },
  filename: (req, file, cb) => {
    // Generate a unique filename: timestamp + sanitized original name
    const uniqueSuffix = Date.now();
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_"); // Sanitize
    const finalFilename = `${uniqueSuffix}-${safeOriginalName}`;
    cb(null, finalFilename);
  },
});

// Configure multer for file uploads
const upload = multer({
  storage: storage, // Use the diskStorage config
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false); // Pass false for rejection
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
