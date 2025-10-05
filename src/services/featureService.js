const Feature = require("../models/Feature");
const Session = require("../models/Session");
const User = require("../models/User");
const changeLogService = require("./changeLogService");

class FeatureService {
  async createFeature(sessionId, userId, featureData) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const feature = await Feature.create({
      sessionId,
      createdBy: userId,
      ...featureData,
    });

    await changeLogService.createLog(
      "Feature",
      feature._id,
      "create",
      userId,
      null,
      feature.toObject()
    );

    return feature;
  }

  async getSessionFeatures(
    sessionId,
    userId,
    filters = {},
    page = 1,
    limit = 20
  ) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const skip = (page - 1) * limit;
    const query = { sessionId };

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } },
      ];
    }

    const [features, total] = await Promise.all([
      Feature.find(query)
        .populate("createdBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Feature.countDocuments(query),
    ]);

    return { features, total };
  }

  async getFeatureById(featureId, userId) {
    const feature = await Feature.findById(featureId)
      .populate("createdBy", "fullName email")
      .populate("sessionId");

    if (!feature) {
      throw new Error("Feature not found");
    }

    const session = await Session.findById(feature.sessionId);
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    return feature;
  }

  async updateFeature(featureId, userId, updateData) {
    const feature = await Feature.findById(featureId);
    if (!feature) {
      throw new Error("Feature not found");
    }

    const session = await Session.findById(feature.sessionId);
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    const isAssigned = session.assignees.some(
      (a) => a.toString() === userId.toString()
    );

    if (
      !userOrg ||
      (!["owner", "admin"].includes(userOrg.role) && !isAssigned)
    ) {
      throw new Error("Access denied");
    }

    const before = feature.toObject();

    Object.keys(updateData).forEach((key) => {
      feature[key] = updateData[key];
    });

    await feature.save();

    await changeLogService.createLog(
      "Feature",
      feature._id,
      "update",
      userId,
      before,
      feature.toObject()
    );

    return feature;
  }

  async deleteFeature(featureId, userId) {
    const feature = await Feature.findById(featureId);
    if (!feature) {
      throw new Error("Feature not found");
    }

    const session = await Session.findById(feature.sessionId);
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can delete features");
    }

    await changeLogService.createLog(
      "Feature",
      feature._id,
      "delete",
      userId,
      feature.toObject(),
      null
    );

    await Feature.findByIdAndDelete(featureId);

    return feature;
  }
}

module.exports = new FeatureService();
