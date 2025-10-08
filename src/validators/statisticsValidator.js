const Joi = require("joi");

const duplicateSessionSchema = Joi.object({
  newTitle: Joi.string().min(2).max(200),
  newAssignees: Joi.array().items(Joi.string()),
  includeDescription: Joi.boolean().default(true),
  copyStatus: Joi.string()
    .valid("draft", "open", "in_progress", "completed", "archived")
    .default("draft"),
  preserveDates: Joi.boolean().default(false),
});

const duplicateSessionCustomSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000).allow(""),
  assignees: Joi.array().items(Joi.string()).default([]),
  status: Joi.string()
    .valid("draft", "open", "in_progress", "completed", "archived")
    .default("draft"),
  startAt: Joi.date().allow(null),
  endAt: Joi.date().allow(null),
  featuresToInclude: Joi.array().items(Joi.string()),
  resetAllStatuses: Joi.boolean().default(true),
});

module.exports = {
  duplicateSessionSchema,
  duplicateSessionCustomSchema,
};
