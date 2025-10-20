const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middlewares/auth');

// Get organization billing info
router.get(
  '/organizations/:orgId',
  authenticate,
  billingController.getBillingInfo
);

// Get all available plans
router.get(
  '/plans',
  billingController.getAllPlans
);

// Get usage statistics
router.get(
  '/organizations/:orgId/usage',
  authenticate,
  billingController.getUsageStats
);

// Request plan upgrade
router.post(
  '/organizations/:orgId/request-upgrade',
  authenticate,
  billingController.requestUpgrade
);

// Check if organization can upgrade
router.get(
  '/organizations/:orgId/can-upgrade',
  authenticate,
  billingController.canUpgrade
);

// Admin routes (add admin middleware)
router.post(
  '/admin/organizations/:orgId/approve-plan',
  authenticate,
  // TODO: Add admin middleware
  billingController.manuallyApprovePlan
);

router.get(
  '/admin/dashboard',
  authenticate,
  // TODO: Add admin middleware
  billingController.getDashboardStats
);

router.get(
  '/admin/approaching-limits',
  authenticate,
  // TODO: Add admin middleware
  billingController.getOrganizationsApproachingLimits
);

module.exports = router;
