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
const {
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/invitationValidator");

router.post("/signup", validate(signupSchema), authController.signup);
router.post("/login", validate(loginSchema), authController.login);
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refreshToken
);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getMe);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.get("/verify-reset-token/:token", authController.verifyResetToken);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
