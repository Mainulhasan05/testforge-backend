const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");
const {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
} = require("../validators/authValidator");

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refreshToken
);
router.post("/logout", authenticate, authController.logout);

module.exports = router;
