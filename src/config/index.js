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

  email: {
    host: process.env.EMAIL_HOST || "mail.mainulhasan99.xyz",
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: process.env.EMAIL_SECURE === "true",
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || "noreply@mainulhasan99.xyz",
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
