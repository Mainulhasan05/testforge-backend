const Joi = require("joi");

const createInvitationSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid("owner", "admin", "member").default("member"),
});

const acceptInvitationSchema = Joi.object({
  token: Joi.string().required(),
});

const declineInvitationSchema = Joi.object({
  token: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

module.exports = {
  createInvitationSchema,
  acceptInvitationSchema,
  declineInvitationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
