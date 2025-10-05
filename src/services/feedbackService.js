const Feedback = require("../models/Feedback");
const Case = require("../models/Case");
const Feature = require("../models/Feature");
const Session = require("../models/Session");
const User = require("../models/User");
const changeLogService = require("./changeLogService");

class FeedbackService {
  async createFeedback(caseId, userId, feedbackData) {
    const testCase = await Case.findById(caseId).populate("featureId");
    if (!testCase) {
      throw new Error("Case not found");
    }

    const feature = await Feature.findById(testCase.featureId).populate(
      "sessionId"
    );
    const session = await Session.findById(feature.sessionId);

    const isAssigned = session.assignees.some(
      (a) => a.toString() === userId.toString()
    );

    if (!isAssigned) {
      throw new Error("Only assigned testers can provide feedback");
    }

    const feedback = await Feedback.create({
      caseId,
      testerId: userId,
      ...feedbackData,
    });

    await changeLogService.createLog(
      "Feedback",
      feedback._id,
      "feedback",
      userId,
      null,
      feedback.toObject()
    );

    return feedback;
  }

  async getCaseFeedback(caseId, userId, page = 1, limit = 20) {
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

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      Feedback.find({ caseId })
        .populate("testerId", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Feedback.countDocuments({ caseId }),
    ]);

    return { feedback, total };
  }

  async getFeedbackById(feedbackId, userId) {
    const feedback = await Feedback.findById(feedbackId)
      .populate("testerId", "fullName email")
      .populate("caseId");

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    const testCase = await Case.findById(feedback.caseId).populate("featureId");
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

    return feedback;
  }
}

module.exports = new FeedbackService();
