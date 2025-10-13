const Session = require("../models/Session");
const Feature = require("../models/Feature");
const Case = require("../models/Case");
const Feedback = require("../models/Feedback");
const TesterProgress = require("../models/TesterProgress");
const User = require("../models/User");

class SessionDashboardService {
  /**
   * Get complete session data with features, cases, and user feedback
   * Single API call to load everything needed for quick test mode
   */
  async getSessionDashboard(sessionId, userId) {
    // 1. Get session
    const session = await Session.findById(sessionId)
      .populate("orgId", "name slug")
      .populate("createdBy", "fullName email")
      .populate("assignees", "fullName email");

    if (!session) {
      throw new Error("Session not found");
    }

    // 2. Verify access
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId._id.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    // 3. Get all features for this session
    const features = await Feature.find({ sessionId })
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    // 4. Get all cases for all features
    const featureIds = features.map((f) => f._id);
    const cases = await Case.find({ featureId: { $in: featureIds } })
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 });

    // 5. Get all user's feedback for these cases
    const caseIds = cases.map((c) => c._id);
    const userFeedbacks = await Feedback.find({
      caseId: { $in: caseIds },
      testerId: userId,
    })
      .populate("testerId", "fullName email")
      .sort({ createdAt: -1 });

    // Create a map for quick lookup
    const feedbackMap = {};
    userFeedbacks.forEach((feedback) => {
      feedbackMap[feedback.caseId.toString()] = feedback;
    });

    // 6. Get or create tester progress
    let testerProgress = await TesterProgress.findOne({ sessionId, testerId: userId });

    if (!testerProgress) {
      // Create initial progress record
      testerProgress = await TesterProgress.create({
        sessionId,
        testerId: userId,
        totalCases: cases.length,
        testedCases: userFeedbacks.length,
        passedCases: userFeedbacks.filter((f) => f.result === "pass").length,
        failedCases: userFeedbacks.filter((f) => f.result === "fail").length,
        progressPercentage:
          cases.length > 0
            ? Math.round((userFeedbacks.length / cases.length) * 100)
            : 0,
        status: userFeedbacks.length > 0 ? "in_progress" : "not_started",
      });
    } else {
      // Update total cases if changed
      if (testerProgress.totalCases !== cases.length) {
        testerProgress.totalCases = cases.length;
        testerProgress.progressPercentage =
          cases.length > 0
            ? Math.round((testerProgress.testedCases / cases.length) * 100)
            : 0;
        await testerProgress.save();
      }
    }

    // 7. Build feature tree with cases and feedback
    const featuresWithCases = features.map((feature) => {
      const featureCases = cases
        .filter((c) => c.featureId.toString() === feature._id.toString())
        .map((testCase) => ({
          ...testCase.toObject(),
          userFeedback: feedbackMap[testCase._id.toString()] || null,
        }));

      return {
        ...feature.toObject(),
        cases: featureCases,
        stats: {
          total: featureCases.length,
          tested: featureCases.filter((c) => c.userFeedback).length,
          passed: featureCases.filter((c) => c.userFeedback?.result === "pass")
            .length,
          failed: featureCases.filter((c) => c.userFeedback?.result === "fail")
            .length,
        },
      };
    });

    // 8. Return complete dashboard data
    return {
      session: session.toObject(),
      features: featuresWithCases,
      progress: testerProgress.toObject(),
      stats: {
        totalFeatures: features.length,
        totalCases: cases.length,
        testedCases: testerProgress.testedCases,
        passedCases: testerProgress.passedCases,
        failedCases: testerProgress.failedCases,
        untestedCases: cases.length - testerProgress.testedCases,
        progressPercentage: testerProgress.progressPercentage,
      },
    };
  }

  /**
   * Get tester progress for a session
   */
  async getTesterProgress(sessionId, userId) {
    let progress = await TesterProgress.findOne({ sessionId, testerId: userId })
      .populate("testerId", "fullName email")
      .populate({
        path: "activityLog.caseId",
        select: "title",
      });

    if (!progress) {
      // Count total cases
      const features = await Feature.find({ sessionId });
      const featureIds = features.map((f) => f._id);
      const totalCases = await Case.countDocuments({
        featureId: { $in: featureIds },
      });

      progress = await TesterProgress.create({
        sessionId,
        testerId: userId,
        totalCases,
      });
    }

    return progress;
  }

  /**
   * Get all testers progress for a session (for admins)
   */
  async getAllTestersProgress(sessionId, requesterId) {
    const session = await Session.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Verify admin access
    const user = await User.findById(requesterId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can view all testers progress");
    }

    const allProgress = await TesterProgress.find({ sessionId })
      .populate("testerId", "fullName email")
      .sort({ progressPercentage: -1 });

    return allProgress;
  }
}

module.exports = new SessionDashboardService();
