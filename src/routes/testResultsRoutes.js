const express = require('express');
const router = express.Router();
const testResultsController = require('../controllers/testResultsController');
const { authenticate } = require('../middlewares/auth');

// Get all test results for a session with filters
router.get(
  '/:sessionId/results',
  authenticate,
  testResultsController.getTestResults
);

module.exports = router;
