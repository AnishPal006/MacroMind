const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      lowercase: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      minLength: 6,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      validate: { min: 1, max: 150 },
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    healthConditions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "e.g., diabetes, hypertension, high_cholesterol",
    },
    allergies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "e.g., peanuts, shellfish, dairy",
    },
    dietaryPreferences: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "e.g., vegetarian, vegan, keto, gluten_free",
    },
    dailyCaloricGoal: {
      type: DataTypes.INTEGER,
      defaultValue: 2000,
      comment: "Daily calorie intake goal",
    },
    proteinGoalGrams: {
      type: DataTypes.FLOAT,
      defaultValue: 50,
      comment: "Daily protein goal in grams",
    },
    carbsGoalGrams: {
      type: DataTypes.FLOAT,
      defaultValue: 250,
      comment: "Daily carbs goal in grams",
    },
    fatsGoalGrams: {
      type: DataTypes.FLOAT,
      defaultValue: 65,
      comment: "Daily fats goal in grams",
    },
    waterIntakeGoalMl: {
      type: DataTypes.INTEGER,
      defaultValue: 2000,
      comment: "Daily water intake goal in ml",
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
    tableName: "users",
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Method to compare passwords
User.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Method to get user data without sensitive info
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
