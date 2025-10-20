const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("./User");

const DailyLog = sequelize.define(
  "DailyLog",
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      index: true,
    },
    totalCalories: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalProtein: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalCarbs: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalFats: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalFiber: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    waterIntakeMl: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    goalMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mealBreakdown: {
      type: DataTypes.JSON,
      defaultValue: {
        breakfast: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        lunch: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        dinner: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        snack: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      },
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
    tableName: "daily_logs",
    indexes: [{ fields: ["userId", "date"] }, { fields: ["date"] }],
  }
);

DailyLog.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(DailyLog, { foreignKey: "userId", as: "dailyLogs" });

module.exports = DailyLog;
