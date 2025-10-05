const Joi = require("joi");

const createOrganizationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string()
    .min(2)
    .max(50)
    .lowercase()
    .pattern(/^[a-z0-9-]+$/)
    .required(),
});

const addMemberSchema = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid("owner", "admin", "member").default("member"),
});

module.exports = {
  createOrganizationSchema,
  addMemberSchema,
};
