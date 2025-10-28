const jiraService = require('../services/jiraService');
const { sendSuccess, sendError } = require('../utils/response');

class JiraController {
  /**
   * Save Jira configuration
   */
  async saveConfig(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;

      const config = await jiraService.saveConfig(orgId, userId, req.body);

      return sendSuccess(res, config, 'Jira configuration saved successfully', null, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Jira configuration
   */
  async getConfig(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;

      const config = await jiraService.getConfig(orgId, userId);

      if (!config) {
        return sendSuccess(res, null, 'No Jira configuration found', null, 200);
      }

      return sendSuccess(res, config, 'Jira configuration retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete Jira configuration
   */
  async deleteConfig(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;

      await jiraService.deleteConfig(orgId, userId);

      return sendSuccess(res, null, 'Jira configuration deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test Jira connection
   */
  async testConnection(req, res, next) {
    try {
      const result = await jiraService.testConnection(req.body);

      if (result.success) {
        return sendSuccess(res, result, 'Connection successful', null, 200);
      } else {
        return sendError(res, result.message, 'CONNECTION_FAILED', {}, 400);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create Jira ticket from issue
   */
  async createTicket(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { ticketData, orgId } = req.body;
      console.log("Received request to create Jira ticket for issue:", issueId, "with data:", ticketData);

      const result = await jiraService.createTicket(orgId, issueId, ticketData, userId);

      return sendSuccess(res, result, 'Jira ticket created successfully', null, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync Jira ticket status
   */
  async syncTicketStatus(req, res, next) {
    try {
      const { issueId } = req.params;

      const result = await jiraService.syncTicketStatus(issueId);

      return sendSuccess(res, result, 'Jira ticket synced successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unlink Jira ticket
   */
  async unlinkTicket(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      await jiraService.unlinkTicket(issueId, userId);

      return sendSuccess(res, null, 'Jira ticket unlinked successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Jira projects
   */
  async getProjects(req, res, next) {
    try {
      const projects = await jiraService.getProjects(req.body);

      return sendSuccess(res, projects, 'Jira projects retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Jira issue types
   */
  async getIssueTypes(req, res, next) {
    try {
      const issueTypes = await jiraService.getIssueTypes(req.body);

      return sendSuccess(res, issueTypes, 'Jira issue types retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get assignable users for a project
   */
  async getAssignableUsers(req, res, next) {
    try {
      const users = await jiraService.getAssignableUsers(req.body);

      return sendSuccess(res, users, 'Assignable users retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search for users by name or email
   */
  async searchUsers(req, res, next) {
    try {
      const { query } = req.query;
      if (!query) {
        return sendError(res, 'Query parameter is required', 'INVALID_INPUT', {}, 400);
      }

      const users = await jiraService.searchUsers(req.body, query);

      return sendSuccess(res, users, 'Users retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project members
   */
  async getProjectMembers(req, res, next) {
    try {
      const members = await jiraService.getProjectMembers(req.body);

      return sendSuccess(res, members, 'Project members retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new JiraController();
