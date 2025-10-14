const Joi = require("joi");

const createCaseSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  note: Joi.string().max(1000).allow(""),
  expectedOutput: Joi.string().max(1000).allow(""),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string()
    .valid("todo", "in_progress", "completed")
    .default("todo"),
});

const updateCaseSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  note: Joi.string().max(1000),
  expectedOutput: Joi.string().max(1000),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid("todo", "in_progress", "completed"),
});

const bulkCreateCasesSchema = Joi.object({
  cases: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().min(2).max(200).required(),
        note: Joi.string().max(1000).allow(""),
        expectedOutput: Joi.string().max(1000).allow(""),
        sortOrder: Joi.number().integer().min(0).default(0),
        status: Joi.string()
          .valid("todo", "in_progress", "completed")
          .default("todo"),
      })
    )
    .min(1)
    .max(100)
    .required(),
});

module.exports = {
  createCaseSchema,
  updateCaseSchema,
  bulkCreateCasesSchema,
};
