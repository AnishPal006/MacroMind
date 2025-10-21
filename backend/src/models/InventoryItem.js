// backend/src/models/InventoryItem.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("./User");
const Food = require("./Food"); // Optional: Link to Food model if desired

const InventoryItem = sequelize.define(
  "InventoryItem",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE", // Delete item if user is deleted
    },
    // Optional: Link to a known food item if scanned/selected
    foodId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: "foods", key: "id" },
      onDelete: "SET NULL", // Keep inventory item even if food is deleted, just unlink
    },
    // Required: User-friendly name, even if foodId is not set
    itemName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
    },
    unit: {
      type: DataTypes.STRING, // e.g., 'grams', 'kg', 'ml', 'liters', 'pieces', 'cans'
      allowNull: true,
      defaultValue: "pieces",
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      index: true, // Index for potentially querying expiring items
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "inventory_items",
    indexes: [{ fields: ["userId"] }, { fields: ["userId", "expiryDate"] }],
  }
);

// Associations
InventoryItem.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(InventoryItem, { foreignKey: "userId", as: "inventoryItems" });

// Optional association with Food model
InventoryItem.belongsTo(Food, { foreignKey: "foodId", as: "foodItem" });

module.exports = InventoryItem;
