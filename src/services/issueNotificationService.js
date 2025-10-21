const Issue = require('../models/Issue');
const Organization = require('../models/Organization');
const User = require('../models/User');
const emailService = require('../utils/emailService');

class IssueNotificationService {
  /**
   * Send email notification about issues to organization members
   */
  async notifyOrgMembers(issueId, userId, customMessage = '') {
    const issue = await Issue.findById(issueId).populate('orgId');
    if (!issue) {
      throw new Error('Issue not found');
    }

    const org = issue.orgId;

    // Get all members of the organization
    const memberIds = [...org.owners, ...org.members];
    const uniqueMemberIds = [...new Set(memberIds.map(id => id.toString()))];

    const members = await User.find({ _id: { $in: uniqueMemberIds } });

    // Populate issue with images
    await issue.populate({
      path: 'images.imageId',
      select: 'publicUrl fileName'
    });

    // Send emails to all members
    const emailPromises = members.map(member =>
      emailService.sendIssuesNotificationEmail(
        member.email,
        member.fullName,
        org.name,
        [issue],
        customMessage,
        org._id
      )
    );

    await Promise.all(emailPromises);

    // Record notification
    issue.notificationsSent.push({
      sentAt: new Date(),
      sentBy: userId,
      recipientCount: members.length,
      emailSubject: `${issue.title}`
    });

    await issue.save();

    return {
      recipientCount: members.length,
      sentAt: new Date()
    };
  }

  /**
   * Send email notification about multiple issues
   */
  async notifyOrgMembersMultiple(orgId, userId, issueIds, customMessage = '') {
    const org = await Organization.findById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const issues = await Issue.find({ _id: { $in: issueIds }, orgId })
      .populate({
        path: 'images.imageId',
        select: 'publicUrl fileName'
      })
      .populate('reportedBy', 'fullName')
      .populate('votes.userId', 'fullName')
      .populate('comments.userId', 'fullName');

    if (issues.length === 0) {
      throw new Error('No issues found');
    }

    // Get all members of the organization
    const memberIds = [...org.owners, ...org.members];
    const uniqueMemberIds = [...new Set(memberIds.map(id => id.toString()))];

    const members = await User.find({ _id: { $in: uniqueMemberIds } });

    // Send emails to all members
    const emailPromises = members.map(member =>
      emailService.sendIssuesNotificationEmail(
        member.email,
        member.fullName,
        org.name,
        issues,
        customMessage,
        org._id
      )
    );

    await Promise.all(emailPromises);

    // Record notifications for each issue
    const updatePromises = issues.map(issue => {
      issue.notificationsSent.push({
        sentAt: new Date(),
        sentBy: userId,
        recipientCount: members.length,
        emailSubject: `Batch notification: ${issues.length} issues`
      });
      return issue.save();
    });

    await Promise.all(updatePromises);

    return {
      recipientCount: members.length,
      issueCount: issues.length,
      sentAt: new Date()
    };
  }
}

module.exports = new IssueNotificationService();
