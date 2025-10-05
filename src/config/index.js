require("dotenv").config();

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/test-session-platform",
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "access_secret_change_me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret_change_me",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  },
};
