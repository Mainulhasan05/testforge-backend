const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { authenticate } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  createIssueSchema,
  updateIssueSchema,
  updateStatusSchema,
  assignIssueSchema,
  addCommentSchema,
  updateCommentSchema,
  voteSchema,
  addImagesSchema,
} = require('../validators/issueValidator');

// All routes require authentication
router.use(authenticate);

// Organization-scoped routes: /api/orgs/:orgId/issues
router.post(
  '/:orgId/issues',
  validate(createIssueSchema),
  issueController.createIssue
);

router.get(
  '/:orgId/issues',
  issueController.getIssues
);

router.get(
  '/:orgId/issues/stats',
  issueController.getStats
);

// Direct issue routes: /api/issues/:issueId
router.get(
  '/:issueId',
  issueController.getIssueById
);

router.put(
  '/:issueId',
  validate(updateIssueSchema),
  issueController.updateIssue
);

router.delete(
  '/:issueId',
  issueController.deleteIssue
);

// Status management
router.patch(
  '/:issueId/status',
  validate(updateStatusSchema),
  issueController.updateStatus
);

// Assignment
router.post(
  '/:issueId/assign',
  validate(assignIssueSchema),
  issueController.assignIssue
);

// Comments
router.post(
  '/:issueId/comments',
  validate(addCommentSchema),
  issueController.addComment
);

router.put(
  '/:issueId/comments/:commentId',
  validate(updateCommentSchema),
  issueController.updateComment
);

router.delete(
  '/:issueId/comments/:commentId',
  issueController.deleteComment
);

// Voting
router.post(
  '/:issueId/vote',
  validate(voteSchema),
  issueController.voteOnIssue
);

router.delete(
  '/:issueId/vote',
  issueController.removeVote
);

// Watchers
router.post(
  '/:issueId/watch',
  issueController.toggleWatch
);

// Images
router.post(
  '/:issueId/images',
  validate(addImagesSchema),
  issueController.addImages
);

router.delete(
  '/:issueId/images/:imageId',
  issueController.removeImage
);

// AI features
router.post(
  '/:issueId/ai/generate-ticket',
  issueController.generateAITicket
);

router.post(
  '/:issueId/ai/analyze',
  issueController.analyzeIssue
);

// Notifications
router.post(
  '/:issueId/notify',
  issueController.notifyMembers
);

router.post(
  '/:orgId/issues/notify-batch',
  issueController.notifyMembersMultiple
);

module.exports = router;
