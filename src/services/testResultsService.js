const Session = require('../models/Session');
const Feature = require('../models/Feature');
const Case = require('../models/Case');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

class TestResultsService {
  /**
   * Get all test results for a session with filtering options
   * @param {String} sessionId
   * @param {Object} filters - { testerIds: [], status: [] }
   * @returns {Promise<Object>}
   */
  async getSessionTestResults(sessionId, filters = {}) {
    // 1. Verify session exists
    const session = await Session.findById(sessionId)
      .populate('orgId', 'name')
      .populate('assignees', 'fullName email');

    if (!session) {
      throw new Error('Session not found');
    }

    // 2. Get all features for this session
    const features = await Feature.find({ sessionId })
      .sort({ createdAt: -1 })
      .lean();

    // 3. Get all test cases for all features
    const featureIds = features.map(f => f._id);
    const allCases = await Case.find({ featureId: { $in: featureIds } })
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: 1 })
      .lean();

    // 4. Get all feedback for these cases
    const caseIds = allCases.map(c => c._id);
    let feedbackQuery = { caseId: { $in: caseIds } };

    // Apply tester filter if provided
    if (filters.testerIds && filters.testerIds.length > 0) {
      feedbackQuery.testerId = { $in: filters.testerIds };
    }

    const allFeedback = await Feedback.find(feedbackQuery)
      .populate('testerId', 'fullName email')
      .populate('caseId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // 5. Group feedback by case
    const feedbackByCase = {};
    allFeedback.forEach(feedback => {
      const caseId = feedback.caseId._id.toString();
      if (!feedbackByCase[caseId]) {
        feedbackByCase[caseId] = [];
      }
      feedbackByCase[caseId].push(feedback);
    });

    // 6. Build test results structure
    const results = features.map(feature => {
      // Get cases for this feature
      const featureCases = allCases.filter(
        c => c.featureId.toString() === feature._id.toString()
      );

      // Process each case with feedback stats
      const casesWithResults = featureCases.map(testCase => {
        const caseFeedback = feedbackByCase[testCase._id.toString()] || [];

        // Calculate stats
        const passCount = caseFeedback.filter(f => f.result === 'pass').length;
        const failCount = caseFeedback.filter(f => f.result === 'fail').length;
        const totalTesters = session.assignees.length;
        const testedCount = caseFeedback.length;
        const untestedCount = totalTesters - testedCount;

        // Get unique testers who tested
        const testersSummary = caseFeedback.map(f => ({
          testerId: f.testerId._id,
          testerName: f.testerId.fullName,
          testerEmail: f.testerId.email,
          result: f.result,
          comment: f.comment,
          createdAt: f.createdAt,
        }));

        return {
          _id: testCase._id,
          title: testCase.title,
          note: testCase.note,
          expectedOutput: testCase.expectedOutput,
          createdBy: testCase.createdBy,
          stats: {
            passCount,
            failCount,
            testedCount,
            untestedCount,
            totalTesters,
          },
          feedback: testersSummary,
          overallStatus:
            testedCount === 0 ? 'untested' :
            failCount > 0 ? 'failed' :
            passCount === totalTesters ? 'passed' :
            'partial',
        };
      });

      // Apply status filter if provided
      let filteredCases = casesWithResults;
      if (filters.status && filters.status.length > 0) {
        filteredCases = casesWithResults.filter(c => {
          if (filters.status.includes('passed') && c.overallStatus === 'passed') return true;
          if (filters.status.includes('failed') && c.overallStatus === 'failed') return true;
          if (filters.status.includes('partial') && c.overallStatus === 'partial') return true;
          if (filters.status.includes('untested') && c.overallStatus === 'untested') return true;
          return false;
        });
      }

      return {
        _id: feature._id,
        title: feature.title,
        description: feature.description,
        cases: filteredCases,
        stats: {
          totalCases: featureCases.length,
          passedCases: casesWithResults.filter(c => c.overallStatus === 'passed').length,
          failedCases: casesWithResults.filter(c => c.overallStatus === 'failed').length,
          partialCases: casesWithResults.filter(c => c.overallStatus === 'partial').length,
          untestedCases: casesWithResults.filter(c => c.overallStatus === 'untested').length,
        },
      };
    });

    // 7. Calculate overall statistics
    const allCasesFlat = results.flatMap(f => f.cases);
    const overallStats = {
      totalFeatures: features.length,
      totalCases: allCases.length,
      totalTesters: session.assignees.length,
      totalFeedback: allFeedback.length,
      passedCases: allCasesFlat.filter(c => c.overallStatus === 'passed').length,
      failedCases: allCasesFlat.filter(c => c.overallStatus === 'failed').length,
      partialCases: allCasesFlat.filter(c => c.overallStatus === 'partial').length,
      untestedCases: allCasesFlat.filter(c => c.overallStatus === 'untested').length,
    };

    return {
      session: {
        _id: session._id,
        title: session.title,
        orgId: session.orgId,
        assignees: session.assignees,
      },
      features: results,
      stats: overallStats,
    };
  }
}

module.exports = new TestResultsService();
