const { verifyAccessToken } = require("../utils/jwt");
const { sendError } = require("../utils/response");
const User = require("../models/User");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(res, "No token provided", "AUTH_TOKEN_MISSING", {}, 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return sendError(
        res,
        "Invalid or expired token",
        "AUTH_TOKEN_INVALID",
        {},
        401
      );
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return sendError(res, "User not found", "USER_NOT_FOUND", {}, 404);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(
      res,
      "Authentication failed",
      "AUTH_FAILED",
      { error: error.message },
      401
    );
  }
};

const requireGlobalRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(
        res,
        "Authentication required",
        "AUTH_REQUIRED",
        {},
        401
      );
    }

    if (!roles.includes(req.user.globalRole)) {
      return sendError(
        res,
        "Insufficient permissions",
        "PERMISSION_DENIED",
        {},
        403
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireGlobalRole,
};
