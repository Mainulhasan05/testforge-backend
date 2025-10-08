const Session = require('../models/Session');
const Feature = require('../models/Feature');
const Case = require('../models/Case');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const mongoose = require('mongoose');

class StatisticsService {
  async getSessionStatistics(sessionId, userId) {
    const session = await Session.findById(sessionId).populate('orgId');
    if (!session) {
      throw new Error('Session not found');
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(o => o.orgId.toString() === session.orgId._id.toString());
    if (!userOrg) {
      throw new Error('Access denied');
    }

    const features = await Feature.find({ sessionId });
    const featureIds = features.map(f => f._id);
    const cases = await Case.find({ featureId: { $in: featureIds } });
    const caseIds = cases.map(c => c._id);
    const feedbacks = await Feedback.find({ caseId: { $in: caseIds } });

    const uniqueTesters = new Set(feedbacks.map(f => f.testerId.toString()));
    const totalTesters = uniqueTesters.size;

    const testedCases = new Set(feedbacks.map(f => f.caseId.toString()));
    const totalTestedCases = testedCases.size;
    const totalUntested = cases.length - totalTestedCases;

    const passFeedbacks = feedbacks.filter(f => f.result === 'pass').length;
    const failFeedbacks = feedbacks.filter(f => f.result === 'fail').length;
    const totalFeedback = feedbacks.length;

    const passPercentage = totalFeedback > 0 ? ((passFeedbacks / totalFeedback) * 100).toFixed(2) : 0;
    const failPercentage = totalFeedback > 0 ? ((failFeedbacks / totalFeedback) * 100).toFixed(2) : 0;

    const featureStats = await Promise.all(features.map(async (feature) => {
      const featureCases = cases.filter(c => c.featureId.toString() === feature._id.toString());
      const featureCaseIds = featureCases.map(c => c._id);
      const featureFeedbacks = feedbacks.filter(f => featureCaseIds.some(cId => cId.toString() === f.caseId.toString()));

      const completedCases = featureCases.filter(c => c.status === 'completed').length;
      const inProgressCases = featureCases.filter(c => c.status === 'in_progress').length;
      const todoCases = featureCases.filter(c => c.status === 'todo').length;

      const featurePass = featureFeedbacks.filter(f => f.result === 'pass').length;
      const featureFail = featureFeedbacks.filter(f => f.result === 'fail').length;
      const featureTotalFeedback = featureFeedbacks.length;

      const passRate = featureTotalFeedback > 0 ? ((featurePass / featureTotalFeedback) * 100).toFixed(2) : 0;
      const failRate = featureTotalFeedback > 0 ? ((featureFail / featureTotalFeedback) * 100).toFixed(2) : 0;

      const criticalityScore = this.calculateCriticalityScore(
        featureFail,
        featureTotalFeedback,
        featureCases.length
      );

      return {
        featureId: feature._id,
        featureName: feature.title,
        totalCases: featureCases.length,
        completedCases,
        inProgressCases,
        todoCases,
        totalFeedback: featureTotalFeedback,
        passFeedback: featurePass,
        failFeedback: featureFail,
        passRate: parseFloat(passRate),
        failRate: parseFloat(failRate),
        criticalityScore: parseFloat(criticalityScore),
        criticalityLevel: this.getCriticalityLevel(criticalityScore)
      };
    }));

    featureStats.sort((a, b) => b.criticalityScore - a.criticalityScore);

    const testerParticipation = await this.getTesterParticipation(sessionId, feedbacks);

    const caseStatusDistribution = {
      completed: cases.filter(c => c.status === 'completed').length,
      inProgress: cases.filter(c => c.status === 'in_progress').length,
      todo: cases.filter(c => c.status === 'todo').length
    };

    return {
      session: {
        id: session._id,
        title: session.title,
        status: session.status,
        assignedTesters: session.assignees.length,
        startDate: session.startAt,
        endDate: session.endAt
      },
      overview: {
        totalFeatures: features.length,
        totalCases: cases.length,
        testedCases: totalTestedCases,
        untestedCases: totalUntested,
        totalFeedback: totalFeedback,
        uniqueTesters: totalTesters
      },
      testResults: {
        pass: passFeedbacks,
        fail: failFeedbacks,
        passPercentage: parseFloat(passPercentage),
        failPercentage: parseFloat(failPercentage)
      },
      caseStatus: caseStatusDistribution,
      features: featureStats,
      criticalFeatures: featureStats.filter(f => f.criticalityLevel === 'Critical' || f.criticalityLevel === 'High'),
      testerParticipation
    };
  }

  calculateCriticalityScore(failCount, totalFeedback, totalCases) {
    if (totalFeedback === 0) return 0;
    
    const failRate = (failCount / totalFeedback) * 100;
    const testCoverage = totalFeedback / totalCases;
    
    const criticalityScore = (failRate * 0.7) + (testCoverage * 30);
    
    return Math.min(criticalityScore, 100).toFixed(2);
  }

  getCriticalityLevel(score) {
    if (score >= 70) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 30) return 'Medium';
    return 'Low';
  }

  async getTesterParticipation(sessionId, feedbacks) {
    const testerStats = {};

    for (const feedback of feedbacks) {
      const testerId = feedback.testerId.toString();
      if (!testerStats[testerId]) {
        testerStats[testerId] = {
          testerId,
          totalTests: 0,
          passCount: 0,
          failCount: 0
        };
      }
      testerStats[testerId].totalTests++;
      if (feedback.result === 'pass') {
        testerStats[testerId].passCount++;
      } else {
        testerStats[testerId].failCount++;
      }
    }

    const testerIds = Object.keys(testerStats);
    const testers = await User.find({ _id: { $in: testerIds } }).select('fullName email');

    const participation = Object.values(testerStats).map(stat => {
      const tester = testers.find(t => t._id.toString() === stat.testerId);
      return {
        testerId: stat.testerId,
        testerName: tester?.fullName || 'Unknown',
        testerEmail: tester?.email || 'Unknown',
        totalTests: stat.totalTests,
        passCount: stat.passCount,
        failCount: stat.failCount,
        passRate: ((stat.passCount / stat.totalTests) * 100).toFixed(2)
      };
    });

    return participation.sort((a, b) => b.totalTests - a.totalTests);
  }

  async getOrganizationStatistics(orgId, userId) {
    const user = await User.findById(userId);
    const userOrg = user.organizations.find(o => o.orgId.toString() === orgId.toString());
    if (!userOrg) {
      throw new Error('Access denied');
    }

    const sessions = await Session.find({ orgId });
    const sessionIds = sessions.map(s => s._id);

    const features = await Feature.find({ sessionId: { $in: sessionIds } });
    const featureIds = features.map(f => f._id);

    const cases = await Case.find({ featureId: { $in: featureIds } });
    const caseIds = cases.map(c => c._id);

    const feedbacks = await Feedback.find({ caseId: { $in: caseIds } });

    const sessionStats = sessions.map(session => {
      const sessionFeatures = features.filter(f => f.sessionId.toString() === session._id.toString());
      const sessionFeatureIds = sessionFeatures.map(f => f._id);
      const sessionCases = cases.filter(c => sessionFeatureIds.some(fId => fId.toString() === c.featureId.toString()));
      const sessionCaseIds = sessionCases.map(c => c._id);
      const sessionFeedbacks = feedbacks.filter(f => sessionCaseIds.some(cId => cId.toString() === f.caseId.toString()));

      return {
        sessionId: session._id,
        sessionTitle: session.title,
        status: session.status,
        totalFeatures: sessionFeatures.length,
        totalCases: sessionCases.length,
        totalFeedback: sessionFeedbacks.length,
        passCount: sessionFeedbacks.filter(f => f.result === 'pass').length,
        failCount: sessionFeedbacks.filter(f => f.result === 'fail').length
      };
    });

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => s.status === 'open' || s.status === 'in_progress').length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      totalFeatures: features.length,
      totalCases: cases.length,
      totalFeedback: feedbacks.length,
      overallPassRate: feedbacks.length > 0 
        ? ((feedbacks.filter(f => f.result === 'pass').length / feedbacks.length) * 100).toFixed(2)
        : 0,
      sessions: sessionStats
    };
  }
}

module.exports = new StatisticsService();