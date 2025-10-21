const Joi = require('joi');

// Only validate req.body - params/query validation handled in controllers
const createIssueSchema = Joi.object({
  title: Joi.string().required().trim().max(255),
  description: Joi.string().required().trim(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  category: Joi.string().valid('bug', 'broken_feature', 'performance', 'security', 'ui_ux', 'enhancement', 'other').default('bug'),
  tags: Joi.array().items(Joi.string().trim()),
  environment: Joi.string().valid('production', 'staging', 'development').default('production'),
  browser: Joi.string().trim().allow(''),
  deviceInfo: Joi.string().trim().allow(''),
  impactedUsers: Joi.number().integer().min(0).default(0)
});

const updateIssueSchema = Joi.object({
  title: Joi.string().trim().max(255),
  description: Joi.string().trim(),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
  category: Joi.string().valid('bug', 'broken_feature', 'performance', 'security', 'ui_ux', 'enhancement', 'other'),
  tags: Joi.array().items(Joi.string().trim()),
  environment: Joi.string().valid('production', 'staging', 'development'),
  browser: Joi.string().trim().allow(''),
  deviceInfo: Joi.string().trim().allow(''),
  impactedUsers: Joi.number().integer().min(0)
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'wont_fix').required(),
  resolutionNotes: Joi.string().trim().allow('')
});

const assignIssueSchema = Joi.object({
  assignToUserId: Joi.string().hex().length(24).required()
});

const addCommentSchema = Joi.object({
  text: Joi.string().required().trim(),
  imageIds: Joi.array().items(Joi.string().hex().length(24)).default([])
});

const updateCommentSchema = Joi.object({
  text: Joi.string().required().trim()
});

const voteSchema = Joi.object({
  voteType: Joi.string().valid('confirm', 'cannot_reproduce', 'needs_info', 'critical').required(),
  comment: Joi.string().trim().allow('')
});

const addImagesSchema = Joi.object({
  imageIds: Joi.array().items(Joi.string().hex().length(24)).required().min(1),
  captions: Joi.array().items(Joi.string().trim().allow('')).default([])
});

module.exports = {
  createIssueSchema,
  updateIssueSchema,
  updateStatusSchema,
  assignIssueSchema,
  addCommentSchema,
  updateCommentSchema,
  voteSchema,
  addImagesSchema,
};
