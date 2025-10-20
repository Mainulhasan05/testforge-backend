const billingService = require('../services/billingService');
const { sendSuccess, sendError } = require('../utils/response');

// Get organization billing info
exports.getBillingInfo = async (req, res) => {
  try {
    const { orgId } = req.params;

    const billing = await billingService.getBillingInfo(orgId);

    return sendSuccess(res, billing, 'Billing information retrieved successfully');
  } catch (error) {
    console.error('Get billing info error:', error);
    return sendError(res, error.message, 500);
  }
};

// Get all available plans
exports.getAllPlans = async (req, res) => {
  try {
    const plans = billingService.getAllPlans();

    // Format plans for frontend
    const formattedPlans = Object.entries(plans).map(([key, value]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      ...value,
      features: getFeaturesByPlan(key),
    }));

    return sendSuccess(res, formattedPlans, 'Plans retrieved successfully');
  } catch (error) {
    console.error('Get plans error:', error);
    return sendError(res, error.message, 500);
  }
};

// Helper function to get features by plan
function getFeaturesByPlan(plan) {
  const commonFeatures = [
    'Test session management',
    'Feature & case tracking',
    'Feedback system',
    'Activity changelog',
    'Team collaboration',
  ];

  const featuresByPlan = {
    free: [
      ...commonFeatures,
      'External image links only',
      'Up to 5 team members',
      'Email support',
    ],
    starter: [
      ...commonFeatures,
      '500 MB image storage',
      '5 GB bandwidth',
      '1,000 uploads/month',
      'Up to 10 team members',
      'Email support',
    ],
    professional: [
      ...commonFeatures,
      '5 GB image storage',
      '50 GB bandwidth',
      '10,000 uploads/month',
      'Unlimited team members',
      'Priority email support',
      'Advanced analytics',
    ],
    business: [
      ...commonFeatures,
      '50 GB image storage',
      '500 GB bandwidth',
      '100,000 uploads/month',
      'Unlimited team members',
      'Priority email & chat support',
      'Advanced analytics',
      'Custom branding',
      'API access',
    ],
    enterprise: [
      ...commonFeatures,
      'Custom storage limits',
      'Custom bandwidth',
      'Unlimited uploads',
      'Unlimited team members',
      'Dedicated account manager',
      'SLA guarantees',
      'Advanced analytics',
      'Custom branding',
      'API access',
      'Single Sign-On (SSO)',
      'Custom integrations',
    ],
  };

  return featuresByPlan[plan] || [];
}

// Get usage statistics
exports.getUsageStats = async (req, res) => {
  try {
    const { orgId } = req.params;

    const stats = await billingService.getUsageStats(orgId);

    return sendSuccess(res, stats, 'Usage statistics retrieved successfully');
  } catch (error) {
    console.error('Get usage stats error:', error);
    return sendError(res, error.message, 500);
  }
};

// Request plan upgrade (for manual approval)
exports.requestUpgrade = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { plan, notes } = req.body;

    if (!plan) {
      return sendError(res, 'Plan is required', 400);
    }

    // In a real app, this would create a request ticket for admin approval
    // For now, we'll just return success with instructions

    const billing = await billingService.getBillingInfo(orgId);

    return sendSuccess(
      res,
      {
        currentPlan: billing.plan,
        requestedPlan: plan,
        message: 'Upgrade request submitted. You will be contacted by our team for payment processing.',
      },
      'Upgrade request submitted successfully'
    );
  } catch (error) {
    console.error('Request upgrade error:', error);
    return sendError(res, error.message, 500);
  }
};

// Admin: Manually approve plan
exports.manuallyApprovePlan = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { plan, notes } = req.body;

    if (!plan) {
      return sendError(res, 'Plan is required', 400);
    }

    // Check if user is admin (add admin check middleware)
    const billing = await billingService.manuallyApprovePlan(
      orgId,
      plan,
      req.user._id,
      notes
    );

    return sendSuccess(res, billing, 'Plan approved successfully');
  } catch (error) {
    console.error('Manually approve plan error:', error);
    return sendError(res, error.message, 500);
  }
};

// Admin: Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await billingService.getDashboardStats();

    return sendSuccess(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return sendError(res, error.message, 500);
  }
};

// Admin: Get organizations approaching limits
exports.getOrganizationsApproachingLimits = async (req, res) => {
  try {
    const { threshold = 80 } = req.query;

    const organizations = await billingService.getOrganizationsApproachingLimits(
      parseInt(threshold)
    );

    return sendSuccess(
      res,
      organizations,
      'Organizations approaching limits retrieved successfully'
    );
  } catch (error) {
    console.error('Get organizations approaching limits error:', error);
    return sendError(res, error.message, 500);
  }
};

// Check if organization can upgrade
exports.canUpgrade = async (req, res) => {
  try {
    const { orgId } = req.params;

    const result = await billingService.canUpgrade(orgId);

    return sendSuccess(res, result, 'Upgrade eligibility checked successfully');
  } catch (error) {
    console.error('Can upgrade error:', error);
    return sendError(res, error.message, 500);
  }
};
