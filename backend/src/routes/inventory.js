// backend/src/routes/inventory.js
const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const InventoryItem = require("../models/InventoryItem"); // Import the model
const Food = require("../models/Food"); // Import Food for associations
const geminiService = require("../services/geminiService");

const router = express.Router();

// All inventory routes are protected
router.use(authMiddleware);

// GET all inventory items for the logged-in user
router.get("/", async (req, res) => {
  try {
    const items = await InventoryItem.findAll({
      where: { userId: req.userId },
      include: [
        {
          model: Food,
          as: "foodItem", // Use the alias defined in the association
          attributes: ["name", "category"], // Select only needed attributes
        },
      ],
      order: [["itemName", "ASC"]],
    });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
      error: err.message,
    });
  }
});

// POST a new inventory item
router.post("/", async (req, res) => {
  try {
    const { itemName, quantity, unit, purchaseDate, expiryDate, foodId } =
      req.body;
    const userId = req.userId;

    if (!itemName || quantity === undefined || quantity === null) {
      // Check quantity existence explicitly
      return res.status(400).json({
        success: false,
        message: "Item name and quantity are required",
      });
    }

    const newItem = await InventoryItem.create({
      userId,
      itemName,
      quantity: parseFloat(quantity) || 0, // Ensure quantity is a number
      unit: unit || "pieces",
      purchaseDate: purchaseDate || null,
      expiryDate: expiryDate || null,
      foodId: foodId || null,
    });

    res.status(201).json({
      success: true,
      message: "Item added to inventory",
      data: newItem,
    });
  } catch (err) {
    console.error("Add inventory item error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add item",
      error: err.message,
    });
  }
});

// PUT (Update) an existing inventory item
router.put("/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId;
    const { itemName, quantity, unit, purchaseDate, expiryDate, foodId } =
      req.body;

    const item = await InventoryItem.findOne({
      where: { id: itemId, userId: userId },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    // Update fields if they are provided
    if (itemName !== undefined) item.itemName = itemName;
    if (quantity !== undefined) item.quantity = parseFloat(quantity) || 0; // Ensure number
    if (unit !== undefined) item.unit = unit;
    if (purchaseDate !== undefined) item.purchaseDate = purchaseDate;
    if (expiryDate !== undefined) item.expiryDate = expiryDate;
    if (foodId !== undefined) item.foodId = foodId;

    await item.save();

    res
      .status(200)
      .json({ success: true, message: "Inventory item updated", data: item });
  } catch (err) {
    console.error("Update inventory item error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update item",
      error: err.message,
    });
  }
});

// DELETE an inventory item
router.delete("/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId;

    const item = await InventoryItem.findOne({
      where: { id: itemId, userId: userId },
    });

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Inventory item not found" });
    }

    await item.destroy();

    res.status(200).json({ success: true, message: "Inventory item deleted" });
  } catch (err) {
    console.error("Delete inventory item error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete item",
      error: err.message,
    });
  }
});

router.get("/suggestions", async (req, res) => {
  try {
    const userId = req.userId;
    const suggestions = await geminiService.getMealSuggestions(userId);
    res.status(200).json({ success: true, data: suggestions });
  } catch (err) {
    console.error("Get meal suggestions route error:", err);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to get meal suggestions",
        error: err.message,
      });
  }
});

module.exports = router;
