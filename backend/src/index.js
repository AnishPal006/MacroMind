require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { sequelize } = require("./config/database");

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://macro-mind-six.vercel.app/", // Your Vercel frontend URL
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes will be imported here
app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/food", require("./routes/food"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/community", require("./routes/community"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "MacroMind API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Database sync and start server
const PORT = process.env.PORT || 5000;

sequelize
  .sync()
  .then(() => {
    console.log("Database synced successfully");
    app.listen(PORT, () => {
      console.log(`MacroMind API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
