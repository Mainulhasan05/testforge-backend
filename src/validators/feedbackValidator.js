const Joi = require("joi");

const createFeedbackSchema = Joi.object({
  result: Joi.string().valid("pass", "fail").required(),
  comment: Joi.string().max(1000).allow(""),
});

module.exports = {
  createFeedbackSchema,
};
