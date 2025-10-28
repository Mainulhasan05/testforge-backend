const express = require('express');
const router = express.Router();
const jiraController = require('../controllers/jiraController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  saveJiraConfigSchema,
  testConnectionSchema,
  createJiraTicketSchema,
} = require('../validators/jiraValidator');

// All routes require authentication
router.use(authenticate);

// Jira configuration routes: /api/jira/orgs/:orgId
router.post(
  '/orgs/:orgId/config',
  validate(saveJiraConfigSchema),
  jiraController.saveConfig
);

router.get(
  '/orgs/:orgId/config',
  jiraController.getConfig
);

router.put(
  '/orgs/:orgId/config',
  validate(saveJiraConfigSchema),
  jiraController.saveConfig
);

router.delete(
  '/orgs/:orgId/config',
  jiraController.deleteConfig
);

router.post(
  '/orgs/:orgId/test-connection',
  validate(testConnectionSchema),
  jiraController.testConnection
);

// Get Jira metadata
router.post(
  '/projects',
  validate(testConnectionSchema),
  jiraController.getProjects
);

router.post(
  '/issue-types',
  validate(testConnectionSchema),
  jiraController.getIssueTypes
);

// Get Jira users
router.post(
  '/assignable-users',
  validate(testConnectionSchema),
  jiraController.getAssignableUsers
);

router.post(
  '/search-users',
  validate(testConnectionSchema),
  jiraController.searchUsers
);

router.post(
  '/project-members',
  validate(testConnectionSchema),
  jiraController.getProjectMembers
);

// Issue-specific Jira routes: /api/jira/issues/:issueId
router.post(
  '/issues/:issueId/create',
  validate(createJiraTicketSchema),
  jiraController.createTicket
);

router.post(
  '/issues/:issueId/sync',
  jiraController.syncTicketStatus
);

router.delete(
  '/issues/:issueId/unlink',
  jiraController.unlinkTicket
);

module.exports = router;
