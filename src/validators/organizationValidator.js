const Joi = require("joi");

const createOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(1000).allow(""),
});

const updateOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(1000).allow(""),
});

const addMemberSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid("owner", "admin", "member").default("member"),
});

const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid("owner", "admin", "member").required(),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
};
