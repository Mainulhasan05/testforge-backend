const { sendError } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "ValidationError") {
    const details = Object.keys(err.errors).reduce((acc, key) => {
      acc[key] = err.errors[key].message;
      return acc;
    }, {});
    return sendError(res, "Validation error", "VALIDATION_ERROR", details, 400);
  }

  if (err.name === "CastError") {
    return sendError(
      res,
      "Invalid ID format",
      "INVALID_ID",
      { field: err.path },
      400
    );
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendError(
      res,
      `${field} already exists`,
      "DUPLICATE_ERROR",
      { field },
      409
    );
  }

  return sendError(
    res,
    err.message || "Internal server error",
    err.code || "INTERNAL_ERROR",
    {},
    err.statusCode || 500
  );
};

const notFound = (req, res) => {
  sendError(
    res,
    "Route not found",
    "NOT_FOUND",
    { path: req.originalUrl },
    404
  );
};

module.exports = {
  errorHandler,
  notFound,
};
