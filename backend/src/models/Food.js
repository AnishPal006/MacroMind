const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Food = sequelize.define(
  "Food",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true,
    },
    category: {
      type: DataTypes.ENUM(
        "fruits",
        "vegetables",
        "grains",
        "protein",
        "dairy",
        "oils",
        "sweets",
        "beverages",
        "other"
      ),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    caloriesPer100g: {
      type: DataTypes.FLOAT,
      allowNull: false,
      comment: "Calories per 100g",
    },
    proteinGrams: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Protein per 100g",
    },
    carbsGrams: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Carbohydrates per 100g",
    },
    fatsGrams: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Fats per 100g",
    },
    fiberGrams: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Fiber per 100g",
    },
    sugarGrams: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Sugar per 100g",
    },
    sodiumMg: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "Sodium per 100g",
    },
    allergens: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "e.g., peanuts, dairy, shellfish",
    },
    ingredients: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
      comment: "List of ingredients",
    },
    barcode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      index: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM(
        "usda",
        "nutritionix",
        "user_input",
        "manual",
        "gemini"
      ), // <-- Added 'gemini
      defaultValue: "manual",
    },
    sourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "ID from external source (USDA, Nutritionix, etc.)",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether nutrition data is verified by admin",
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
    tableName: "foods",
    indexes: [
      { fields: ["name"] },
      { fields: ["barcode"] },
      { fields: ["category"] },
    ],
  }
);

module.exports = Food;
