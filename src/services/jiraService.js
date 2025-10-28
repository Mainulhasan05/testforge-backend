const axios = require('axios');
const FormData = require('form-data');
const JiraConfig = require('../models/JiraConfig');
const Issue = require('../models/Issue');
const changeLogService = require('./changeLogService');

class JiraService {
  /**
   * Create or update Jira configuration
   */
  async saveConfig(orgId, userId, configData) {
    let config = await JiraConfig.findOne({ userId, orgId });

    if (config) {
      // Update existing config
      // If jiraApiToken is not provided, don't update it (keep existing)
      const updateData = { ...configData };
      if (!updateData.jiraApiToken) {
        delete updateData.jiraApiToken;
      }
      Object.assign(config, updateData);
    } else {
      // Create new config - API token is required
      if (!configData.jiraApiToken) {
        throw new Error('Jira API token is required for new configuration');
      }
      config = new JiraConfig({
        userId,
        orgId,
        ...configData
      });
    }

    await config.save();

    return config.toSafeObject();
  }

  /**
   * Get Jira configuration
   */
  async getConfig(orgId, userId) {
    const config = await JiraConfig.findOne({ userId, orgId });
    return config ? config.toSafeObject() : null;
  }

  /**
   * Delete Jira configuration
   */
  async deleteConfig(orgId, userId) {
    await JiraConfig.findOneAndDelete({ userId, orgId });
    return true;
  }

  /**
   * Test Jira connection
   */
  async testConnection(configData) {
    try {
      // Clean the Jira URL (remove trailing slash)
      const jiraUrl = configData.jiraUrl.replace(/\/$/, '');

      const response = await axios.get(
        `${jiraUrl}/rest/api/3/myself`,
        {
          auth: {
            username: configData.jiraEmail,
            password: configData.jiraApiToken
          },
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        message: 'Connection successful',
        user: response.data.displayName,
        email: response.data.emailAddress
      };
    } catch (error) {
      let errorMessage = 'Connection failed';

      if (error.response) {
        // The request was made and the server responded with a status code
        if (error.response.status === 401) {
          errorMessage = 'Authentication failed. Please check your email and API token. Make sure you\'re using a valid Jira API token (not your password).';
        } else if (error.response.status === 403) {
          errorMessage = 'Access forbidden. Your API token may not have the required permissions.';
        } else if (error.response.status === 404) {
          errorMessage = 'Jira instance not found. Please verify your Jira URL is correct (e.g., https://your-domain.atlassian.net).';
        } else {
          errorMessage = error.response.data?.message || `Request failed with status ${error.response.status}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from Jira. Please check your Jira URL and network connection.';
      } else {
        // Something happened in setting up the request
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        statusCode: error.response?.status,
        error: error.response?.data
      };
    }
  }

  /**
   * Create Jira ticket from issue
   */
  async createTicket(orgId, issueId, ticketData, userId) {
    // Get Jira config for this organization (any user's config will work)
    let config = await JiraConfig.findOne({ orgId });

    if (!config) {
      // Try to find by userId as fallback
      config = await JiraConfig.findOne({ userId, orgId });
    }

    if (!config) {
      throw new Error('Jira not configured for this organization. Please configure Jira in organization settings.');
    }

    if (!config.syncEnabled) {
      throw new Error('Jira sync is disabled');
    }

    console.log("Creating Jira ticket for issue:", issueId);
    console.log("Using Jira config:", {
      url: config.jiraUrl,
      email: config.jiraEmail,
      project: config.jiraProjectKey
    });

    // Get issue with images
    const issue = await Issue.findById(issueId).populate({
      path: 'images.imageId',
      select: 'publicUrl fileName mimeType'
    });

    if (!issue) {
      throw new Error('Issue not found');
    }

    // Prepare Jira payload
    const jiraPayload = {
      fields: {
        project: { key: config.jiraProjectKey },
        summary: ticketData.title,
        description: this.convertToJiraMarkdown(ticketData.description),
        issuetype: { name: config.issueMappings.issueType || 'Bug' },
        priority: { name: this.mapPriority(ticketData.priority, config) }
      }
    };

    // Add labels if provided
    if (ticketData.labels && ticketData.labels.length > 0) {
      jiraPayload.fields.labels = ticketData.labels;
    }

    // Add components if provided
    if (ticketData.components && ticketData.components.length > 0) {
      jiraPayload.fields.components = ticketData.components.map(c => ({ name: c }));
    }

    // Add versions if provided
    if (ticketData.affectsVersions && ticketData.affectsVersions.length > 0) {
      jiraPayload.fields.versions = ticketData.affectsVersions.map(v => ({ name: v }));
    }

    // Add assignee if provided
    if (ticketData.assignee) {
      jiraPayload.fields.assignee = { id: ticketData.assignee };
      console.log("Assigning ticket to:", ticketData.assignee);
    }

    // Decrypt API token
    const apiToken = config.decryptApiToken();
    

    // Ensure Jira URL is properly formatted
    const jiraUrl = config.jiraUrl.replace(/\/$/, '');

    console.log("Sending request to Jira...");
    console.log("URL:", `${jiraUrl}/rest/api/3/issue`);
    console.log("Payload:", JSON.stringify(jiraPayload, null, 2));

    // Create Jira ticket
    let response;
    try {
      response = await axios.post(
        `${jiraUrl}/rest/api/3/issue`,
        jiraPayload,
        {
          auth: {
            username: config.jiraEmail,
            password: apiToken
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
    } catch (error) {
      // Update config status
      config.connectionStatus = 'error';
      config.lastError = error.response?.data?.errorMessages?.[0] || error.message;
      await config.save();

      console.error('Jira ticket creation error:');
      console.error('Status:', error.response?.status);
      console.error('Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Message:', error.message);

      const errorMsg = error.response?.data?.errorMessages?.[0] ||
                       error.response?.data?.errors?.summary ||
                       error.message;

      throw new Error('Failed to create Jira ticket: ' + errorMsg);
    }

    const ticketKey = response.data.key;
    const ticketUrl = `${config.jiraUrl}/browse/${ticketKey}`;

    // Upload images to Jira ticket
    if (issue.images && issue.images.length > 0) {
      await this.uploadImagesToJira(config, apiToken, ticketKey, issue.images);
    }

    // Update issue with Jira info
    issue.jiraTicket = {
      ticketKey,
      ticketUrl,
      createdAt: new Date(),
      syncEnabled: true,
      lastSyncAt: new Date(),
      lastSyncStatus: 'success'
    };
    await issue.save();

    // Update config status
    config.connectionStatus = 'active';
    config.lastSyncAt = new Date();
    config.lastError = undefined;
    await config.save();

    // Log in changelog (only if userId provided)
    if (userId) {
      await changeLogService.createLog(
        'Issue',
        issueId,
        'jira_ticket_created',
        userId,
        null,
        { ticketKey, ticketUrl }
      );
    }

    return { ticketKey, ticketUrl };
  }

  /**
   * Upload images to Jira ticket as attachments
   */
  async uploadImagesToJira(config, apiToken, ticketKey, images) {
    for (const img of images) {
      try {
        if (!img.imageId || !img.imageId.publicUrl) continue;

        // Download image from storage
        const imageResponse = await axios.get(img.imageId.publicUrl, {
          responseType: 'arraybuffer',
          timeout: 30000
        });

        // Prepare form data
        const formData = new FormData();
        formData.append('file', Buffer.from(imageResponse.data), {
          filename: img.imageId.fileName || 'screenshot.png',
          contentType: img.imageId.mimeType || 'image/png'
        });

        // Upload to Jira
        await axios.post(
          `${config.jiraUrl}/rest/api/3/issue/${ticketKey}/attachments`,
          formData,
          {
            auth: {
              username: config.jiraEmail,
              password: apiToken
            },
            headers: {
              'X-Atlassian-Token': 'no-check',
              ...formData.getHeaders()
            },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
          }
        );
      } catch (error) {
        console.error(`Failed to upload image ${img.imageId?._id} to Jira:`, error.message);
        // Continue with other images
      }
    }
  }

  /**
   * Sync Jira ticket status back to issue
   */
  async syncTicketStatus(issueId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    if (!issue.jiraTicket || !issue.jiraTicket.ticketKey) {
      throw new Error('Issue is not linked to a Jira ticket');
    }

    if (!issue.jiraTicket.syncEnabled) {
      throw new Error('Jira sync is disabled for this issue');
    }

    const config = await JiraConfig.findOne({ orgId: issue.orgId });
    if (!config) {
      throw new Error('Jira not configured');
    }

    const apiToken = config.decryptApiToken();

    // Fetch Jira ticket
    let jiraIssue;
    try {
      const response = await axios.get(
        `${config.jiraUrl}/rest/api/3/issue/${issue.jiraTicket.ticketKey}`,
        {
          auth: {
            username: config.jiraEmail,
            password: apiToken
          },
          params: {
            fields: 'status,resolution,assignee,priority'
          },
          timeout: 10000
        }
      );
      jiraIssue = response.data;
    } catch (error) {
      config.connectionStatus = 'error';
      config.lastError = error.message;
      await config.save();

      throw new Error('Failed to fetch Jira ticket: ' + error.message);
    }

    const jiraStatus = jiraIssue.fields.status.name.toLowerCase();
    const jiraResolution = jiraIssue.fields.resolution?.name;

    // Map Jira status to internal status
    const statusMapping = {
      'to do': 'open',
      'open': 'open',
      'in progress': 'in_progress',
      'in review': 'in_progress',
      'done': 'resolved',
      'closed': 'closed',
      'resolved': 'resolved'
    };

    const newStatus = statusMapping[jiraStatus] || issue.status;
    const before = { status: issue.status };

    if (newStatus !== issue.status) {
      issue.status = newStatus;

      if (newStatus === 'resolved' || newStatus === 'closed') {
        issue.resolvedAt = new Date();
        if (jiraResolution) {
          issue.resolutionNotes = `Jira Resolution: ${jiraResolution}`;
        }
      }
    }

    issue.jiraTicket.lastSyncAt = new Date();
    issue.jiraTicket.lastSyncStatus = 'success';
    await issue.save();

    // Update config
    config.connectionStatus = 'active';
    config.lastSyncAt = new Date();
    await config.save();

    // Log sync
    if (newStatus !== before.status) {
      await changeLogService.createLog(
        'Issue',
        issueId,
        'jira_synced',
        null,
        before,
        { status: newStatus, jiraStatus, jiraResolution }
      );
    }

    return {
      synced: true,
      status: newStatus,
      jiraStatus,
      jiraResolution,
      changed: newStatus !== before.status
    };
  }

  /**
   * Unlink Jira ticket from issue
   */
  async unlinkTicket(issueId, userId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const before = issue.jiraTicket;
    issue.jiraTicket = undefined;
    await issue.save();

    await changeLogService.createLog(
      'Issue',
      issueId,
      'jira_unlinked',
      userId,
      { jiraTicket: before },
      null
    );

    return true;
  }

  /**
   * Convert markdown to Jira Atlassian Document Format (ADF)
   */
  convertToJiraMarkdown(markdown) {
    if (!markdown) return {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "No description provided"
            }
          ]
        }
      ]
    };

    // Split into paragraphs and convert to ADF
    const paragraphs = markdown.split('\n\n').filter(p => p.trim());

    const content = paragraphs.map(para => {
      // Check if it's a header
      if (para.startsWith('# ')) {
        return {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: para.replace(/^# /, '') }]
        };
      } else if (para.startsWith('## ')) {
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: para.replace(/^## /, '') }]
        };
      } else if (para.startsWith('### ')) {
        return {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: para.replace(/^### /, '') }]
        };
      } else {
        // Regular paragraph
        return {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: para
            }
          ]
        };
      }
    });

    return {
      type: "doc",
      version: 1,
      content: content.length > 0 ? content : [
        {
          type: "paragraph",
          content: [{ type: "text", text: markdown }]
        }
      ]
    };
  }

  /**
   * Map priority to Jira
   */
  mapPriority(priority, config) {
    const mapping = config.issueMappings?.priority || {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      critical: 'Highest'
    };

    return mapping[priority] || 'Medium';
  }

  /**
   * Get Jira projects (for configuration)
   */
  async getProjects(configData) {
    try {
      const response = await axios.get(
        `${configData.jiraUrl}/rest/api/3/project`,
        {
          auth: {
            username: configData.jiraEmail,
            password: configData.jiraApiToken
          },
          timeout: 10000
        }
      );

      return response.data.map(project => ({
        key: project.key,
        name: project.name,
        id: project.id
      }));
    } catch (error) {
      throw new Error('Failed to fetch Jira projects: ' + error.message);
    }
  }

  /**
   * Get Jira issue types (for configuration)
   */
  async getIssueTypes(configData) {
    try {
      const response = await axios.get(
        `${configData.jiraUrl}/rest/api/3/issuetype`,
        {
          auth: {
            username: configData.jiraEmail,
            password: configData.jiraApiToken
          },
          timeout: 10000
        }
      );

      return response.data.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description
      }));
    } catch (error) {
      throw new Error('Failed to fetch Jira issue types: ' + error.message);
    }
  }

  /**
   * Get assignable users for a project
   */
  async getAssignableUsers(configData) {
    try {
      const jiraUrl = configData.jiraUrl.replace(/\/$/, '');
      const url = `${jiraUrl}/rest/api/3/user/assignable/search?project=${configData.jiraProjectKey}`;

      const response = await axios.get(url, {
        auth: {
          username: configData.jiraEmail,
          password: configData.jiraApiToken
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return response.data.map(user => ({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || null,
        active: user.active !== false,
        avatarUrls: user.avatarUrls
      }));
    } catch (error) {
      console.error('Failed to fetch assignable users:', error.message);
      throw new Error('Failed to fetch assignable users: ' + error.message);
    }
  }

  /**
   * Search for users by name or email
   */
  async searchUsers(configData, query) {
    try {
      const jiraUrl = configData.jiraUrl.replace(/\/$/, '');
      const url = `${jiraUrl}/rest/api/3/user/search?query=${encodeURIComponent(query)}`;

      const response = await axios.get(url, {
        auth: {
          username: configData.jiraEmail,
          password: configData.jiraApiToken
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return response.data.map(user => ({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || null,
        active: user.active !== false,
        avatarUrls: user.avatarUrls
      }));
    } catch (error) {
      console.error('Failed to search users:', error.message);
      throw new Error('Failed to search users: ' + error.message);
    }
  }

  /**
   * Get project members
   */
  async getProjectMembers(configData) {
    try {
      const jiraUrl = configData.jiraUrl.replace(/\/$/, '');
      const url = `${jiraUrl}/rest/api/3/user/assignable/multiProjectSearch?projectKeys=${configData.jiraProjectKey}`;

      const response = await axios.get(url, {
        auth: {
          username: configData.jiraEmail,
          password: configData.jiraApiToken
        },
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      return response.data.map(user => ({
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress || null,
        active: user.active !== false,
        avatarUrls: user.avatarUrls
      }));
    } catch (error) {
      console.error('Failed to fetch project members:', error.message);
      throw new Error('Failed to fetch project members: ' + error.message);
    }
  }
}

module.exports = new JiraService();
