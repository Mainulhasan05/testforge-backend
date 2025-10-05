const Session = require("../models/Session");
const User = require("../models/User");
const changeLogService = require("./changeLogService");

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

    return { sessions, total };
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

    await changeLogService.createLog(
      "Session",
      session._id,
      "delete",
      userId,
      session.toObject(),
      null
    );

    await Session.findByIdAndDelete(sessionId);

    return session;
  }
}

module.exports = new SessionService();
