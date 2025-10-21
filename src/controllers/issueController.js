const issueService = require('../services/issueService');
const issueAIService = require('../services/issueAIService');
const issueNotificationService = require('../services/issueNotificationService');
const { sendSuccess, sendError } = require('../utils/response');

class IssueController {
  /**
   * Create new issue
   */
  async createIssue(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;

      const issue = await issueService.createIssue(orgId, userId, req.body);

      await issue.populate([
        { path: 'reportedBy', select: 'fullName email' },
        { path: 'assignedTo', select: 'fullName email' },
        { path: 'watchers', select: 'fullName email' }
      ]);

      return sendSuccess(res, issue, 'Issue created successfully', null, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all issues for organization
   */
  async getIssues(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;

      const { status, priority, category, assignee, search } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const filters = { status, priority, category, assignee, search };

      const result = await issueService.getIssues(orgId, userId, filters, page, limit);

      return sendSuccess(res, result.issues, 'Issues retrieved successfully', {
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasNext: result.pagination.hasNext,
        hasPrev: result.pagination.hasPrev,
        stats: result.stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get issue statistics
   */
  async getStats(req, res, next) {
    try {
      const { orgId } = req.params;
      const stats = await issueService.getIssueStats(orgId);

      return sendSuccess(res, stats, 'Statistics retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get issue by ID
   */
  async getIssueById(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      const issue = await issueService.getIssueById(issueId, userId);

      return sendSuccess(res, issue, 'Issue retrieved successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update issue
   */
  async updateIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      const issue = await issueService.updateIssue(issueId, userId, req.body);

      await issue.populate([
        { path: 'reportedBy', select: 'fullName email' },
        { path: 'assignedTo', select: 'fullName email' }
      ]);

      return sendSuccess(res, issue, 'Issue updated successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update issue status
   */
  async updateStatus(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { status, resolutionNotes } = req.body;

      const issue = await issueService.updateStatus(issueId, userId, status, resolutionNotes);

      return sendSuccess(res, issue, 'Status updated successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign issue to user
   */
  async assignIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { assignToUserId } = req.body;

      const issue = await issueService.assignIssue(issueId, userId, assignToUserId);

      await issue.populate('assignedTo', 'fullName email');

      return sendSuccess(res, issue, 'Issue assigned successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add comment
   */
  async addComment(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { text, imageIds } = req.body;

      const comment = await issueService.addComment(issueId, userId, text, imageIds);

      return sendSuccess(res, comment, 'Comment added successfully', null, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update comment
   */
  async updateComment(req, res, next) {
    try {
      const { issueId, commentId } = req.params;
      const userId = req.user._id;
      const { text } = req.body;

      const comment = await issueService.updateComment(issueId, commentId, userId, text);

      return sendSuccess(res, comment, 'Comment updated successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(req, res, next) {
    try {
      const { issueId, commentId } = req.params;
      const userId = req.user._id;

      await issueService.deleteComment(issueId, commentId, userId);

      return sendSuccess(res, null, 'Comment deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vote on issue
   */
  async voteOnIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { voteType, comment } = req.body;

      const issue = await issueService.voteOnIssue(issueId, userId, voteType, comment);

      return sendSuccess(res, {
        voteStats: issue.voteStats,
        severity: issue.severity,
        status: issue.status
      }, 'Vote recorded successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove vote
   */
  async removeVote(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      const issue = await issueService.removeVote(issueId, userId);

      return sendSuccess(res, {
        voteStats: issue.voteStats,
        severity: issue.severity
      }, 'Vote removed successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle watch
   */
  async toggleWatch(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      const result = await issueService.toggleWatch(issueId, userId);

      return sendSuccess(res, result, result.isWatching ? 'Now watching issue' : 'Stopped watching issue', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add images
   */
  async addImages(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { imageIds, captions } = req.body;

      const issue = await issueService.addImages(issueId, userId, imageIds, captions);

      return sendSuccess(res, issue.images, 'Images added successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove image
   */
  async removeImage(req, res, next) {
    try {
      const { issueId, imageId } = req.params;
      const userId = req.user._id;

      const issue = await issueService.removeImage(issueId, userId, imageId);

      return sendSuccess(res, issue.images, 'Image removed successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete issue
   */
  async deleteIssue(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;

      await issueService.deleteIssue(issueId, userId);

      return sendSuccess(res, null, 'Issue deleted successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate AI ticket content
   */
  async generateAITicket(req, res, next) {
    try {
      const { issueId } = req.params;

      const ticketData = await issueAIService.generateJiraTicketContent(issueId);

      return sendSuccess(res, ticketData, 'AI ticket content generated successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze issue with AI
   */
  async analyzeIssue(req, res, next) {
    try {
      const { issueId } = req.params;

      const analysis = await issueAIService.analyzeIssueSeverity(issueId);

      return sendSuccess(res, analysis, 'Issue analyzed successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send notification to org members
   */
  async notifyMembers(req, res, next) {
    try {
      const { issueId } = req.params;
      const userId = req.user._id;
      const { customMessage } = req.body;

      const result = await issueNotificationService.notifyOrgMembers(issueId, userId, customMessage);

      return sendSuccess(res, result, 'Notification sent successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send notification about multiple issues
   */
  async notifyMembersMultiple(req, res, next) {
    try {
      const { orgId } = req.params;
      const userId = req.user._id;
      const { issueIds, customMessage } = req.body;

      const result = await issueNotificationService.notifyOrgMembersMultiple(orgId, userId, issueIds, customMessage);

      return sendSuccess(res, result, 'Notification sent successfully', null, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IssueController();
