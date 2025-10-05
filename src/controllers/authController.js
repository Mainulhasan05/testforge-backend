const authService = require("../services/authService");
const { sendSuccess, sendError } = require("../utils/response");

class AuthController {
  async signup(req, res, next) {
    try {
      const { email, fullName, password } = req.body;

      const result = await authService.signup(email, fullName, password);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        "User registered successfully",
        null,
        201
      );
    } catch (error) {
      if (error.message === "Email already exists") {
        return sendError(res, error.message, "EMAIL_EXISTS", {}, 409);
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);

      sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
        "Login successful"
      );
    } catch (error) {
      if (error.message === "Invalid credentials") {
        return sendError(res, error.message, "INVALID_CREDENTIALS", {}, 401);
      }
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return sendError(
          res,
          "Refresh token required",
          "REFRESH_TOKEN_REQUIRED",
          {},
          400
        );
      }

      const result = await authService.refreshToken(refreshToken);

      sendSuccess(res, result, "Token refreshed successfully");
    } catch (error) {
      if (
        error.message.includes("Invalid") ||
        error.message.includes("not found")
      ) {
        return sendError(res, error.message, "INVALID_REFRESH_TOKEN", {}, 401);
      }
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      await authService.logout(req.user._id, refreshToken);

      sendSuccess(res, null, "Logout successful");
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      sendSuccess(res, req.user, "User profile retrieved");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
