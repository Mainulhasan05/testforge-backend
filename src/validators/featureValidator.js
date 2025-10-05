const Joi = require("joi");

const createFeatureSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).allow(""),
});

const updateFeatureSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
});

module.exports = {
  createFeatureSchema,
  updateFeatureSchema,
};
