const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("./User");
const Food = require("./Food");

const FoodScan = sequelize.define(
  "FoodScan",
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
    },
    foodId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "foods", key: "id" },
    },
    quantityGrams: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100,
      comment: "Quantity of food in grams",
    },
    mealType: {
      type: DataTypes.ENUM("breakfast", "lunch", "dinner", "snack"),
      allowNull: false,
    },
    scanDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    scannedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL of the scanned image",
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 1 },
      comment: "Confidence score from AI model (0-1)",
    },
    detectedAllergens: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "Allergens detected in this food",
    },
    allergenWarning: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "True if allergen warning triggered",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: "food_scans",
    indexes: [
      { fields: ["userId"] },
      { fields: ["scanDate"] },
      { fields: ["userId", "scanDate"] },
    ],
  }
);

// Associations
FoodScan.belongsTo(User, { foreignKey: "userId", as: "user" });
FoodScan.belongsTo(Food, { foreignKey: "foodId", as: "food" });
User.hasMany(FoodScan, { foreignKey: "userId", as: "scans" });

module.exports = FoodScan;
