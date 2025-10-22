const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // This is often necessary for free tier cloud databases
    },
  },
});

// Test connection
sequelize
  .authenticate()
  .then(() => console.log("Database connection established"))
  .catch((err) => console.error("Database connection error:", err));

module.exports = { sequelize };
