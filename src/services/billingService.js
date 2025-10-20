const OrganizationBilling = require('../models/OrganizationBilling');
const Organization = require('../models/Organization');

class BillingService {
  /**
   * Create billing record for organization
   * @param {String} orgId
   * @param {String} plan
   * @returns {Promise<OrganizationBilling>}
   */
  async createBillingRecord(orgId, plan = 'free') {
    // Check if billing record already exists
    const existing = await OrganizationBilling.findOne({ orgId });

    if (existing) {
      throw new Error('Billing record already exists for this organization');
    }

    const planLimits = OrganizationBilling.PLAN_LIMITS[plan];

    if (!planLimits) {
      throw new Error('Invalid plan');
    }

    const billing = new OrganizationBilling({
      orgId,
      plan,
      limits: {
        storage: planLimits.storage,
        bandwidth: planLimits.bandwidth,
        uploadsPerMonth: planLimits.uploadsPerMonth,
        maxFileSize: planLimits.maxFileSize,
      },
      currentUsage: {
        storage: 0,
        bandwidth: 0,
        uploads: 0,
        billingCycleStart: new Date(),
      },
      status: 'active',
    });

    return billing.save();
  }

  /**
   * Get billing information for organization
   * @param {String} orgId
   * @returns {Promise<OrganizationBilling>}
   */
  async getBillingInfo(orgId) {
    let billing = await OrganizationBilling.findOne({ orgId }).populate('orgId', 'name slug');

    // Create billing record if it doesn't exist
    if (!billing) {
      billing = await this.createBillingRecord(orgId, 'free');
      billing = await OrganizationBilling.findOne({ orgId }).populate('orgId', 'name slug');
    }

    return billing;
  }

  /**
   * Get all available plans
   * @returns {Object}
   */
  getAllPlans() {
    return OrganizationBilling.PLAN_LIMITS;
  }

  /**
   * Upgrade organization plan
   * @param {String} orgId
   * @param {String} newPlan
   * @param {String} approvedBy - Admin user ID
   * @returns {Promise<OrganizationBilling>}
   */
  async upgradePlan(orgId, newPlan, approvedBy = null) {
    return OrganizationBilling.upgradePlan(orgId, newPlan, approvedBy);
  }

  /**
   * Downgrade organization plan
   * @param {String} orgId
   * @param {String} newPlan
   * @returns {Promise<OrganizationBilling>}
   */
  async downgradePlan(orgId, newPlan) {
    const billing = await OrganizationBilling.findOne({ orgId });

    if (!billing) {
      throw new Error('Billing record not found');
    }

    const planLimits = OrganizationBilling.PLAN_LIMITS[newPlan];

    if (!planLimits) {
      throw new Error('Invalid plan');
    }

    // Check if current usage exceeds new plan limits
    if (billing.currentUsage.storage > planLimits.storage) {
      throw new Error(
        'Cannot downgrade: Current storage usage exceeds new plan limits. Please delete some files first.'
      );
    }

    billing.plan = newPlan;
    billing.limits = {
      storage: planLimits.storage,
      bandwidth: planLimits.bandwidth,
      uploadsPerMonth: planLimits.uploadsPerMonth,
      maxFileSize: planLimits.maxFileSize,
    };

    billing.updateStatus();

    return billing.save();
  }

  /**
   * Get usage statistics for organization
   * @param {String} orgId
   * @returns {Promise<Object>}
   */
  async getUsageStats(orgId) {
    const billing = await this.getBillingInfo(orgId);

    return billing.getUsageStats();
  }

  /**
   * Check if organization can upgrade
   * @param {String} orgId
   * @returns {Promise<Object>}
   */
  async canUpgrade(orgId) {
    const billing = await this.getBillingInfo(orgId);

    const planOrder = ['free', 'starter', 'professional', 'business', 'enterprise'];
    const currentIndex = planOrder.indexOf(billing.plan);

    if (currentIndex === planOrder.length - 1) {
      return {
        canUpgrade: false,
        reason: 'Already on the highest plan',
        currentPlan: billing.plan,
      };
    }

    return {
      canUpgrade: true,
      currentPlan: billing.plan,
      nextPlan: planOrder[currentIndex + 1],
      nextPlanDetails: OrganizationBilling.PLAN_LIMITS[planOrder[currentIndex + 1]],
    };
  }

  /**
   * Manually approve plan for organization (for manual payment handling)
   * @param {String} orgId
   * @param {String} plan
   * @param {String} approvedBy
   * @param {String} notes
   * @returns {Promise<OrganizationBilling>}
   */
  async manuallyApprovePlan(orgId, plan, approvedBy, notes = '') {
    const billing = await this.getBillingInfo(orgId);

    const planLimits = OrganizationBilling.PLAN_LIMITS[plan];

    if (!planLimits) {
      throw new Error('Invalid plan');
    }

    billing.plan = plan;
    billing.limits = {
      storage: planLimits.storage,
      bandwidth: planLimits.bandwidth,
      uploadsPerMonth: planLimits.uploadsPerMonth,
      maxFileSize: planLimits.maxFileSize,
    };

    billing.manuallyApproved = true;
    billing.approvedBy = approvedBy;
    billing.approvedAt = new Date();
    billing.notes = notes;
    billing.status = 'active';
    billing.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return billing.save();
  }

  /**
   * Suspend organization billing
   * @param {String} orgId
   * @param {String} reason
   * @returns {Promise<OrganizationBilling>}
   */
  async suspendBilling(orgId, reason = '') {
    const billing = await this.getBillingInfo(orgId);

    billing.status = 'suspended';
    billing.notes = reason;

    return billing.save();
  }

  /**
   * Reactivate organization billing
   * @param {String} orgId
   * @returns {Promise<OrganizationBilling>}
   */
  async reactivateBilling(orgId) {
    const billing = await this.getBillingInfo(orgId);

    billing.status = 'active';
    billing.updateStatus(); // Will check usage and set appropriate status

    return billing.save();
  }

  /**
   * Get all organizations by plan
   * @param {String} plan
   * @returns {Promise<Array>}
   */
  async getOrganizationsByPlan(plan) {
    return OrganizationBilling.find({ plan }).populate('orgId', 'name slug');
  }

  /**
   * Get organizations approaching limits
   * @param {Number} threshold - Percentage threshold (e.g., 80 for 80%)
   * @returns {Promise<Array>}
   */
  async getOrganizationsApproachingLimits(threshold = 80) {
    const billings = await OrganizationBilling.find({
      status: 'active',
    }).populate('orgId', 'name slug');

    const approaching = billings.filter(billing => {
      const stats = billing.getUsageStats();

      return (
        stats.storage.percentage >= threshold ||
        stats.uploads.percentage >= threshold ||
        stats.bandwidth.percentage >= threshold
      );
    });

    return approaching.map(billing => ({
      organization: billing.orgId,
      plan: billing.plan,
      usage: billing.getUsageStats(),
      warningLevel: billing.status,
    }));
  }

  /**
   * Reset monthly counters for all organizations
   * @returns {Promise}
   */
  async resetMonthlyCounts() {
    return OrganizationBilling.resetMonthlyCounts();
  }

  /**
   * Get billing dashboard statistics
   * @returns {Promise<Object>}
   */
  async getDashboardStats() {
    const billings = await OrganizationBilling.find();

    const stats = {
      totalOrganizations: billings.length,
      byPlan: {
        free: 0,
        starter: 0,
        professional: 0,
        business: 0,
        enterprise: 0,
      },
      byStatus: {
        active: 0,
        exceeded: 0,
        suspended: 0,
        cancelled: 0,
      },
      revenue: {
        monthly: 0,
        annual: 0,
      },
      totalStorage: 0,
      totalBandwidth: 0,
      totalUploads: 0,
    };

    billings.forEach(billing => {
      // Count by plan
      stats.byPlan[billing.plan]++;

      // Count by status
      stats.byStatus[billing.status]++;

      // Calculate revenue
      const planLimits = OrganizationBilling.PLAN_LIMITS[billing.plan];
      if (billing.billingCycle === 'monthly') {
        stats.revenue.monthly += planLimits.price;
      } else if (billing.billingCycle === 'annual') {
        stats.revenue.annual += planLimits.price * 12 * 0.8; // 20% discount for annual
      }

      // Sum usage
      stats.totalStorage += billing.currentUsage.storage;
      stats.totalBandwidth += billing.currentUsage.bandwidth;
      stats.totalUploads += billing.currentUsage.uploads;
    });

    return stats;
  }
}

module.exports = new BillingService();
