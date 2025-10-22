const Issue = require('../models/Issue');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Image = require('../models/Image');
const changeLogService = require('./changeLogService');

class IssueService {
  /**
   * Create a new issue
   */
  async createIssue(orgId, userId, issueData) {
    // Verify user is member of organization
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const user = await User.findById(userId);
    const isMember = user.organizations.some(o => o.orgId.toString() === orgId.toString());

    if (!isMember) {
      throw new Error('User is not a member of this organization');
    }

    // Clean issueData - remove invalid/empty ObjectId fields
    const cleanedData = { ...issueData };
    if (!cleanedData.assignedTo || cleanedData.assignedTo === '') {
      delete cleanedData.assignedTo;
    }

    // Create issue
    const issue = new Issue({
      orgId,
      reportedBy: userId,
      ...cleanedData,
      watchers: [userId] // Reporter automatically watches the issue
    });

    // Calculate initial severity
    issue.calculateSeverity();

    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'create',
      userId,
      null,
      issue.toObject()
    );

    return issue;
  }

  /**
   * Get all issues for an organization
   */
  async getIssues(orgId, userId, filters = {}, page = 1, limit = 20) {
    // Verify user is member
    const user = await User.findById(userId);
    const isMember = user.organizations.some(o => o.orgId.toString() === orgId.toString());

    if (!isMember) {
      throw new Error('User is not a member of this organization');
    }

    const skip = (page - 1) * limit;
    const query = { orgId };

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }

    if (filters.assignee && filters.assignee !== 'all') {
      query.assignedTo = filters.assignee;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .populate('reportedBy', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .populate('watchers', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Issue.countDocuments(query)
    ]);

    // Get stats for the filtered issues
    const stats = await this.getIssueStats(orgId);

    return {
      issues,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      stats
    };
  }

  /**
   * Get issue statistics
   */
  async getIssueStats(orgId) {
    const mongoose = require('mongoose');
    const orgObjectId = mongoose.Types.ObjectId.isValid(orgId)
      ? new mongoose.Types.ObjectId(orgId)
      : orgId;

    const stats = await Issue.aggregate([
      { $match: { orgId: orgObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } }
        }
      }
    ]);

    return stats[0] || { total: 0, open: 0, resolved: 0, critical: 0 };
  }

  /**
   * Get issue by ID
   */
  async getIssueById(issueId, userId) {
    const issue = await Issue.findById(issueId)
      .populate('reportedBy', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('watchers', 'fullName email')
      .populate('comments.userId', 'fullName email');

    if (!issue) {
      throw new Error('Issue not found');
    }

    // Verify user has access (member of organization)
    const user = await User.findById(userId);
    const isMember = user.organizations.some(o => o.orgId.toString() === issue.orgId.toString());

    if (!isMember) {
      throw new Error('Access denied');
    }

    return issue;
  }

  /**
   * Update issue
   */
  async updateIssue(issueId, userId, updateData) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    // Verify user has access
    const user = await User.findById(userId);
    const isMember = user.organizations.some(o => o.orgId.toString() === issue.orgId.toString());

    if (!isMember) {
      throw new Error('Access denied');
    }

    const before = issue.toObject();

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'orgId' && key !== 'reportedBy') {
        issue[key] = updateData[key];
      }
    });

    // Recalculate severity if relevant fields changed
    if (updateData.priority || updateData.voteStats) {
      issue.calculateSeverity();
    }

    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'update',
      userId,
      before,
      issue.toObject()
    );

    return issue;
  }

  /**
   * Update issue status
   */
  async updateStatus(issueId, userId, status, resolutionNotes) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const before = { status: issue.status };

    issue.status = status;
    if (resolutionNotes) {
      issue.resolutionNotes = resolutionNotes;
    }

    if (['resolved', 'closed', 'wont_fix'].includes(status)) {
      issue.resolvedAt = new Date();
    }

    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'status_change',
      userId,
      before,
      { status: issue.status, resolutionNotes }
    );

    return issue;
  }

  /**
   * Assign issue to user
   */
  async assignIssue(issueId, userId, assignToUserId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const before = { assignedTo: issue.assignedTo };

    issue.assignedTo = assignToUserId;
    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'assign',
      userId,
      before,
      { assignedTo: issue.assignedTo }
    );

    return issue;
  }

  /**
   * Add comment to issue
   */
  async addComment(issueId, userId, text, imageIds = []) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const comment = {
      userId,
      text,
      images: imageIds
    };

    issue.comments.push(comment);
    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'comment_added',
      userId,
      null,
      { comment }
    );

    return issue.comments[issue.comments.length - 1];
  }

  /**
   * Update comment
   */
  async updateComment(issueId, commentId, userId, text) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const comment = issue.comments.id(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new Error('You can only edit your own comments');
    }

    const before = comment.toObject();
    comment.text = text;
    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'comment_updated',
      userId,
      before,
      comment.toObject()
    );

    return comment;
  }

  /**
   * Delete comment
   */
  async deleteComment(issueId, commentId, userId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const comment = issue.comments.id(commentId);
    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId.toString() !== userId.toString()) {
      throw new Error('You can only delete your own comments');
    }

    const before = comment.toObject();
    comment.remove();
    await issue.save();

    // Log in changelog
    await changeLogService.createLog(
      'Issue',
      issue._id,
      'comment_deleted',
      userId,
      before,
      null
    );

    return true;
  }

  /**
   * Vote on issue
   */
  async voteOnIssue(issueId, userId, voteType, comment) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    // Remove existing vote if any
    const existingVoteIndex = issue.votes.findIndex(v => v.userId.toString() === userId.toString());
    if (existingVoteIndex > -1) {
      issue.votes.splice(existingVoteIndex, 1);
    }

    // Add new vote
    issue.votes.push({
      userId,
      voteType,
      comment
    });

    // Update vote stats
    issue.voteStats = {
      confirm: issue.votes.filter(v => v.voteType === 'confirm').length,
      cannot_reproduce: issue.votes.filter(v => v.voteType === 'cannot_reproduce').length,
      needs_info: issue.votes.filter(v => v.voteType === 'needs_info').length,
      critical: issue.votes.filter(v => v.voteType === 'critical').length
    };

    // Recalculate severity
    issue.calculateSeverity();

    await issue.save();

    return issue;
  }

  /**
   * Remove vote
   */
  async removeVote(issueId, userId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const voteIndex = issue.votes.findIndex(v => v.userId.toString() === userId.toString());
    if (voteIndex > -1) {
      issue.votes.splice(voteIndex, 1);

      // Update vote stats
      issue.voteStats = {
        confirm: issue.votes.filter(v => v.voteType === 'confirm').length,
        cannot_reproduce: issue.votes.filter(v => v.voteType === 'cannot_reproduce').length,
        needs_info: issue.votes.filter(v => v.voteType === 'needs_info').length,
        critical: issue.votes.filter(v => v.voteType === 'critical').length
      };

      // Recalculate severity
      issue.calculateSeverity();

      await issue.save();
    }

    return issue;
  }

  /**
   * Toggle watch status
   */
  async toggleWatch(issueId, userId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const isWatching = issue.watchers.some(w => w.toString() === userId.toString());

    if (isWatching) {
      issue.watchers = issue.watchers.filter(w => w.toString() !== userId.toString());
    } else {
      issue.watchers.push(userId);
    }

    await issue.save();

    return {
      isWatching: !isWatching,
      watchersCount: issue.watchers.length
    };
  }

  /**
   * Add images to issue
   */
  async addImages(issueId, userId, imageIds, captions = []) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    imageIds.forEach((imageId, index) => {
      issue.images.push({
        imageId,
        caption: captions[index] || ''
      });
    });

    await issue.save();

    return issue;
  }

  /**
   * Remove image from issue
   */
  async removeImage(issueId, userId, imageId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    issue.images = issue.images.filter(img => img.imageId.toString() !== imageId.toString());
    await issue.save();

    return issue;
  }

  /**
   * Delete issue
   */
  async deleteIssue(issueId, userId) {
    const issue = await Issue.findById(issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    // Verify user is reporter or admin
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(o => o.orgId.toString() === issue.orgId.toString());

    const isReporter = issue.reportedBy.toString() === userId.toString();
    const isAdmin = userOrg && ['owner', 'admin'].includes(userOrg.role);

    if (!isReporter && !isAdmin) {
      throw new Error('Only the reporter or admins can delete issues');
    }

    // Log in changelog before deletion
    await changeLogService.createLog(
      'Issue',
      issueId,
      'delete',
      userId,
      issue.toObject(),
      null
    );

    await Issue.findByIdAndDelete(issueId);

    return true;
  }
}

module.exports = new IssueService();
