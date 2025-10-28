const Session = require("../models/Session");
const User = require("../models/User");
const Feature = require("../models/Feature");
const Case = require("../models/Case");
const Feedback = require("../models/Feedback");
const TesterProgress = require("../models/TesterProgress");
const ChangeLog = require("../models/ChangeLog");
const Organization = require("../models/Organization");
const changeLogService = require("./changeLogService");
const emailService = require("../utils/emailService");

class SessionService {
  async createSession(orgId, userId, sessionData) {
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can create sessions");
    }

    const session = await Session.create({
      orgId,
      createdBy: userId,
      ...sessionData,
    });

    await changeLogService.createLog(
      "Session",
      session._id,
      "create",
      userId,
      null,
      session.toObject()
    );

    return session;
  }

  async getOrganizationSessions(
    orgId,
    userId,
    filters = {},
    page = 1,
    limit = 20
  ) {
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg) {
      throw new Error("User is not a member of this organization");
    }

    const skip = (page - 1) * limit;
    const query = { orgId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.assignee) {
      query.assignees = filters.assignee;
    }

    if (filters.startDate) {
      query.startAt = { $gte: new Date(filters.startDate) };
    }

    if (filters.endDate) {
      query.endAt = { $lte: new Date(filters.endDate) };
    }

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } },
      ];
    }

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate("createdBy", "fullName email")
        .populate("assignees", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Session.countDocuments(query),
    ]);

    // Calculate stats for each session
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const sessionObj = session.toObject();

        // Get all features for this session
        const features = await Feature.find({ sessionId: session._id });
        const featureIds = features.map((f) => f._id);

        // Get all cases for these features
        const cases = await Case.find({ featureId: { $in: featureIds } });
        const caseIds = cases.map((c) => c._id);

        // Get unique tested cases (cases that have at least one feedback)
        const testedCases = caseIds.length > 0
          ? await Feedback.distinct("caseId", {
              caseId: { $in: caseIds },
            })
          : [];

        // Map assignees to assignedTo for frontend consistency
        sessionObj.assignedTo = sessionObj.assignees;
        sessionObj.totalFeatures = features.length;
        sessionObj.totalCases = cases.length;
        sessionObj.completedCases = testedCases.length;

        return sessionObj;
      })
    );

    return { sessions: sessionsWithStats, total };
  }

  async getSessionById(sessionId, userId) {
    const session = await Session.findById(sessionId)
      .populate("createdBy", "fullName email")
      .populate("assignees", "fullName email")
      .populate("orgId", "name slug");

    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId._id.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    return session;
  }

  async updateSession(sessionId, userId, updateData) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can update sessions");
    }

    const before = session.toObject();

    Object.keys(updateData).forEach((key) => {
      session[key] = updateData[key];
    });

    await session.save();

    await changeLogService.createLog(
      "Session",
      session._id,
      "update",
      userId,
      before,
      session.toObject()
    );

    return session;
  }

  async deleteSession(sessionId, userId) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || userOrg.role !== "owner") {
      throw new Error("Only owners can delete sessions");
    }

    // Log session deletion before cascade delete
    await changeLogService.createLog(
      "Session",
      session._id,
      "delete",
      userId,
      session.toObject(),
      null
    );

    // CASCADE DELETE: Delete all related entities

    // 1. Get all features in this session
    const features = await Feature.find({ sessionId });
    const featureIds = features.map((f) => f._id);

    // 2. Get all cases in these features
    const cases = await Case.find({ featureId: { $in: featureIds } });
    const caseIds = cases.map((c) => c._id);

    // 3. Delete all feedback for these cases
    if (caseIds.length > 0) {
      await Feedback.deleteMany({ caseId: { $in: caseIds } });
      console.log(`Deleted feedback for ${caseIds.length} cases`);
    }

    // 4. Delete all cases in these features
    if (featureIds.length > 0) {
      await Case.deleteMany({ featureId: { $in: featureIds } });
      console.log(`Deleted ${cases.length} cases`);
    }

    // 5. Delete all features in this session
    await Feature.deleteMany({ sessionId });
    console.log(`Deleted ${features.length} features`);

    // 6. Delete all tester progress for this session
    await TesterProgress.deleteMany({ sessionId });
    console.log(`Deleted tester progress for session ${sessionId}`);

    // 7. Delete all changelog entries for this session and related entities
    await ChangeLog.deleteMany({
      $or: [
        { entityType: "Session", entityId: sessionId },
        { entityType: "Feature", entityId: { $in: featureIds } },
        { entityType: "Case", entityId: { $in: caseIds } },
      ],
    });
    console.log(`Deleted changelog entries for session and related entities`);

    // 8. Finally, delete the session itself
    await Session.findByIdAndDelete(sessionId);
    console.log(`Deleted session ${sessionId}`);

    return session;
  }

  async duplicateSession(sessionId, userId) {
    // Get original session
    const originalSession = await Session.findById(sessionId);
    if (!originalSession) {
      throw new Error("Session not found");
    }

    // Verify user has access
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === originalSession.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can duplicate sessions");
    }

    // Create new session with "Copy of" prefix
    const newSession = await Session.create({
      orgId: originalSession.orgId,
      createdBy: userId,
      title: `Copy of ${originalSession.title}`,
      description: originalSession.description,
      status: "active", // Reset to active (default)
      assignees: originalSession.assignees,
      startDate: originalSession.startDate,
      endDate: originalSession.endDate,
    });

    // Get all features from original session
    const features = await Feature.find({ sessionId: sessionId });

    // Map to store old feature ID -> new feature ID
    const featureMap = {};

    // Duplicate all features
    for (const feature of features) {
      const newFeature = await Feature.create({
        sessionId: newSession._id,
        createdBy: userId,
        title: feature.title,
        description: feature.description,
      });

      featureMap[feature._id.toString()] = newFeature._id;

      // Get all cases for this feature
      const cases = await Case.find({ featureId: feature._id });

      // Duplicate all cases
      for (const testCase of cases) {
        await Case.create({
          featureId: newFeature._id,
          createdBy: userId,
          title: testCase.title,
          note: testCase.note,
          expectedOutput: testCase.expectedOutput,
          priority: testCase.priority,
        });
      }
    }

    await changeLogService.createLog(
      "Session",
      newSession._id,
      "create",
      userId,
      null,
      {
        ...newSession.toObject(),
        duplicatedFrom: originalSession._id,
      }
    );

    // Return populated session
    const populatedSession = await Session.findById(newSession._id)
      .populate("createdBy", "fullName email")
      .populate("assignees", "fullName email")
      .populate("orgId", "name slug");

    return populatedSession;
  }

  async assignUser(sessionId, userId, assignedBy) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify the person assigning has permission
    const assigningUser = await User.findById(assignedBy);
    const userOrg = assigningUser.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can assign users to sessions");
    }

    // Check if user is already assigned
    if (session.assignees.includes(userId)) {
      throw new Error("User is already assigned to this session");
    }

    // Verify the user being assigned is a member of the organization
    const userToAssign = await User.findById(userId);
    if (!userToAssign) {
      throw new Error("User to assign not found");
    }

    const targetUserOrg = userToAssign.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!targetUserOrg) {
      throw new Error("User is not a member of this organization");
    }

    const before = session.toObject();

    // Add user to assignees
    session.assignees.push(userId);
    await session.save();

    await changeLogService.createLog(
      "Session",
      session._id,
      "update",
      assignedBy,
      before,
      session.toObject()
    );

    // Get organization details for email
    const organization = await Organization.findById(session.orgId);

    // Get statistics for the email
    const features = await Feature.find({ sessionId });
    const featureIds = features.map((f) => f._id);
    const cases = await Case.find({ featureId: { $in: featureIds } });

    // Send assignment email notification (async, don't block response)
    emailService.sendSessionAssignmentEmail(
      userToAssign.email,
      userToAssign.fullName,
      session.title,
      session.description,
      organization.name,
      assigningUser.fullName,
      session._id.toString(),
      session.startDate,
      session.endDate,
      features.length,
      cases.length
    ).then(() => {
      console.log(`✓ Assignment email sent to ${userToAssign.email}`);
    }).catch((emailError) => {
      console.error("✗ Failed to send assignment email:", emailError.message);
      // Don't throw error - assignment should succeed even if email fails
    });

    // Return populated session
    return await Session.findById(sessionId)
      .populate("createdBy", "fullName email")
      .populate("assignees", "fullName email")
      .populate("orgId", "name slug");
  }

  async unassignUser(sessionId, userId, unassignedBy) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify the person unassigning has permission
    const unassigningUser = await User.findById(unassignedBy);
    const userOrg = unassigningUser.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can unassign users from sessions");
    }

    // Get user being unassigned for email
    const userToUnassign = await User.findById(userId);
    if (!userToUnassign) {
      throw new Error("User to unassign not found");
    }

    // Get organization details for email
    const organization = await Organization.findById(session.orgId);

    const before = session.toObject();

    // Remove user from assignees
    session.assignees = session.assignees.filter(
      (assigneeId) => assigneeId.toString() !== userId.toString()
    );
    await session.save();

    await changeLogService.createLog(
      "Session",
      session._id,
      "update",
      unassignedBy,
      before,
      session.toObject()
    );

    // Send unassignment email notification (async, don't block response)
    emailService.sendSessionUnassignmentEmail(
      userToUnassign.email,
      userToUnassign.fullName,
      session.title,
      organization.name,
      unassigningUser.fullName
    ).then(() => {
      console.log(`✓ Unassignment email sent to ${userToUnassign.email}`);
    }).catch((emailError) => {
      console.error("✗ Failed to send unassignment email:", emailError.message);
      // Don't throw error - unassignment should succeed even if email fails
    });

    // Return populated session
    return await Session.findById(sessionId)
      .populate("createdBy", "fullName email")
      .populate("assignees", "fullName email")
      .populate("orgId", "name slug");
  }
}

module.exports = new SessionService();
