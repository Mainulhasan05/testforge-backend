const testResultsService = require('../services/testResultsService');
const { sendSuccess, sendError } = require('../utils/response');

class TestResultsController {
  /**
   * Get all test results for a session with filtering
   */
  async getTestResults(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { testerIds, status } = req.query;

      const filters = {};

      // Parse testerIds (comma-separated string to array)
      if (testerIds) {
        filters.testerIds = testerIds.split(',').filter(id => id.trim());
      }

      // Parse status (comma-separated string to array)
      if (status) {
        filters.status = status.split(',').filter(s => s.trim());
      }

      const results = await testResultsService.getSessionTestResults(
        sessionId,
        filters
      );

      return sendSuccess(res, results, 'Test results retrieved successfully');
    } catch (error) {
      console.error('Get test results error:', error);
      if (error.message.includes('not found')) {
        return sendError(res, error.message, 'NOT_FOUND', {}, 404);
      }
      return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
    }
  }
}

module.exports = new TestResultsController();
