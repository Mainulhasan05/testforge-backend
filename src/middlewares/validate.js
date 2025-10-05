const Joi = require("joi");
const { sendError } = require("../utils/response");

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const details = error.details.reduce((acc, detail) => {
        acc[detail.path.join(".")] = detail.message;
        return acc;
      }, {});

      return sendError(
        res,
        "Validation failed",
        "VALIDATION_ERROR",
        details,
        400
      );
    }

    next();
  };
};

module.exports = validate;
