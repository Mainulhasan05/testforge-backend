const Joi = require("joi");

const createOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).allow(""),
});

const addMemberSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid("owner", "admin", "member").default("member"),
});

module.exports = {
  createOrganizationSchema,
  addMemberSchema,
};
