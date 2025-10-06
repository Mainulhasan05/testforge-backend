const Joi = require("joi");

const createSessionSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).allow(""),
  status: Joi.string().valid("active", "completed", "archived"),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  assignees: Joi.array().items(Joi.string()),
  startAt: Joi.date().allow(null),
  endAt: Joi.date().allow(null),
  timezone: Joi.string().default("UTC"),
});

const updateSessionSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
  status: Joi.string().valid("active", "completed", "archived"),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  assignees: Joi.array().items(Joi.string()),
  startAt: Joi.date().allow(null),
  endAt: Joi.date().allow(null),
  timezone: Joi.string(),
});

module.exports = {
  createSessionSchema,
  updateSessionSchema,
};
