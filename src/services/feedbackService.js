const Feedback = require("../models/Feedback");
const Case = require("../models/Case");
const Feature = require("../models/Feature");
const Session = require("../models/Session");
const User = require("../models/User");
const TesterProgress = require("../models/TesterProgress");
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

    // Update tester progress
    await this.updateTesterProgress(
      session._id,
      userId,
      caseId,
      testCase.featureId,
      feedbackData.result,
      false // isUpdate
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

  async getUserFeedbackForCase(caseId, userId) {
    const testCase = await Case.findById(caseId).populate("featureId");
    if (!testCase) {
      throw new Error("Case not found");
    }

    const feedback = await Feedback.findOne({
      caseId,
      testerId: userId,
    })
      .populate("testerId", "fullName email")
      .sort({ createdAt: -1 });

    return feedback;
  }

  async updateFeedback(feedbackId, userId, updateData) {
    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.testerId.toString() !== userId.toString()) {
      throw new Error("You can only update your own feedback");
    }

    const before = feedback.toObject();

    Object.keys(updateData).forEach((key) => {
      feedback[key] = updateData[key];
    });

    await feedback.save();

    await changeLogService.createLog(
      "Feedback",
      feedback._id,
      "update",
      userId,
      before,
      feedback.toObject()
    );

    // Update tester progress if result changed
    if (before.result !== updateData.result) {
      const testCase = await Case.findById(feedback.caseId);
      const feature = await Feature.findById(testCase.featureId);
      const session = await Session.findById(feature.sessionId);

      await this.updateTesterProgress(
        session._id,
        userId,
        feedback.caseId,
        testCase.featureId,
        updateData.result,
        true // isUpdate
      );
    }

    return feedback;
  }

  async updateTesterProgress(
    sessionId,
    userId,
    caseId,
    featureId,
    result,
    isUpdate
  ) {
    // Get or create tester progress
    let progress = await TesterProgress.findOne({ sessionId, testerId: userId });

    if (!progress) {
      // Count total cases in session
      const features = await Feature.find({ sessionId });
      const featureIds = features.map((f) => f._id);
      const totalCases = await Case.countDocuments({
        featureId: { $in: featureIds },
      });

      progress = new TesterProgress({
        sessionId,
        testerId: userId,
        totalCases,
      });
    }

    // Update progress
    await progress.updateProgress(caseId, featureId, result, isUpdate);

    return progress;
  }

  async deleteFeedback(feedbackId, userId) {
    const feedback = await Feedback.findById(feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.testerId.toString() !== userId.toString()) {
      throw new Error("You can only delete your own feedback");
    }

    await changeLogService.createLog(
      "Feedback",
      feedback._id,
      "delete",
      userId,
      feedback.toObject(),
      null
    );

    await Feedback.findByIdAndDelete(feedbackId);

    return feedback;
  }
}

module.exports = new FeedbackService();
