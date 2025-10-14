const Case = require("../models/Case");
const Feature = require("../models/Feature");
const Session = require("../models/Session");
const Feedback = require("../models/Feedback");
const User = require("../models/User");
const changeLogService = require("./changeLogService");

class CaseService {
  async createCase(featureId, userId, caseData) {
    const feature = await Feature.findById(featureId).populate("sessionId");
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

    const testCase = await Case.create({
      featureId,
      createdBy: userId,
      ...caseData,
    });

    await changeLogService.createLog(
      "Case",
      testCase._id,
      "create",
      userId,
      null,
      testCase.toObject()
    );

    return testCase;
  }

  async getFeatureCases(featureId, userId, filters = {}, page = 1, limit = 20) {
    const feature = await Feature.findById(featureId).populate("sessionId");
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

    const skip = (page - 1) * limit;
    const query = { featureId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.q) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { note: { $regex: filters.q, $options: "i" } },
      ];
    }

    const [cases, total] = await Promise.all([
      Case.find(query)
        .populate("createdBy", "fullName email")
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Case.countDocuments(query),
    ]);

    const casesWithFeedback = await Promise.all(
      cases.map(async (testCase) => {
        // Get the latest feedback overall
        const latestFeedback = await Feedback.findOne({ caseId: testCase._id })
          .sort({ createdAt: -1 })
          .populate("testerId", "fullName email");

        // Get the current user's feedback
        const userFeedback = await Feedback.findOne({
          caseId: testCase._id,
          testerId: userId,
        })
          .sort({ createdAt: -1 })
          .populate("testerId", "fullName email");

        return {
          ...testCase.toObject(),
          latestFeedback,
          userFeedback, // Add user's own feedback
        };
      })
    );

    return { cases: casesWithFeedback, total };
  }

  async getCaseById(caseId, userId) {
    const testCase = await Case.findById(caseId)
      .populate("createdBy", "fullName email")
      .populate("featureId");

    if (!testCase) {
      throw new Error("Case not found");
    }

    const feature = await Feature.findById(testCase.featureId).populate(
      "sessionId"
    );
    const session = await Session.findById(feature.sessionId);
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const latestFeedback = await Feedback.findOne({ caseId: testCase._id })
      .sort({ createdAt: -1 })
      .populate("testerId", "fullName email");

    return {
      ...testCase.toObject(),
      latestFeedback,
    };
  }

  async updateCase(caseId, userId, updateData) {
    const testCase = await Case.findById(caseId).populate("featureId");
    if (!testCase) {
      throw new Error("Case not found");
    }

    const feature = await Feature.findById(testCase.featureId).populate(
      "sessionId"
    );
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

    const before = testCase.toObject();

    Object.keys(updateData).forEach((key) => {
      testCase[key] = updateData[key];
    });

    await testCase.save();

    await changeLogService.createLog(
      "Case",
      testCase._id,
      "update",
      userId,
      before,
      testCase.toObject()
    );

    return testCase;
  }

  async deleteCase(caseId, userId) {
    const testCase = await Case.findById(caseId).populate("featureId");
    if (!testCase) {
      throw new Error("Case not found");
    }

    const feature = await Feature.findById(testCase.featureId).populate(
      "sessionId"
    );
    const session = await Session.findById(feature.sessionId);
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can delete cases");
    }

    await changeLogService.createLog(
      "Case",
      testCase._id,
      "delete",
      userId,
      testCase.toObject(),
      null
    );

    // Delete all related feedback
    await Feedback.deleteMany({ caseId });

    // Delete all related tester progress entries
    const TesterProgress = require("../models/TesterProgress");
    await TesterProgress.deleteMany({ caseId });

    await Case.findByIdAndDelete(caseId);

    return testCase;
  }
}

module.exports = new CaseService();
