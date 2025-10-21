const Joi = require('joi');

const saveJiraConfigSchema = Joi.object({
  jiraUrl: Joi.string().uri().required().trim(),
  jiraEmail: Joi.string().email().required().trim(),
  jiraApiToken: Joi.string().required().trim(),
  jiraProjectKey: Joi.string().required().trim().uppercase(),
  issueMappings: Joi.object({
    priority: Joi.object({
      low: Joi.string().default('Low'),
      medium: Joi.string().default('Medium'),
      high: Joi.string().default('High'),
      critical: Joi.string().default('Highest')
    }).default(),
    issueType: Joi.string().default('Bug'),
    customFields: Joi.object().default({})
  }).default(),
  syncEnabled: Joi.boolean().default(true),
  autoCreateTickets: Joi.boolean().default(false),
  bidirectionalSync: Joi.boolean().default(true)
});

const testConnectionSchema = Joi.object({
  jiraUrl: Joi.string().uri().required().trim(),
  jiraEmail: Joi.string().email().required().trim(),
  jiraApiToken: Joi.string().required().trim()
});

const createJiraTicketSchema = Joi.object({
  orgId: Joi.string().hex().length(24).required(),
  ticketData: Joi.object({
    title: Joi.string().required().max(255),
    description: Joi.string().required(),
    priority: Joi.string().valid('Lowest', 'Low', 'Medium', 'High', 'Highest').default('Medium'),
    labels: Joi.array().items(Joi.string()).default([]),
    components: Joi.array().items(Joi.string()).default([]),
    affectsVersions: Joi.array().items(Joi.string()).default([])
  }).required()
});

module.exports = {
  saveJiraConfigSchema,
  testConnectionSchema,
  createJiraTicketSchema,
};
