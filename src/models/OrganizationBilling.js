const mongoose = require('mongoose');

const organizationBillingSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'professional', 'business', 'enterprise'],
    default: 'free',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly',
  },
  limits: {
    storage: {
      type: Number,
      required: true,
      default: 0, // bytes (free = 0, starter = 500MB, professional = 5GB, etc.)
    },
    bandwidth: {
      type: Number,
      required: true,
      default: 0, // bytes per month
    },
    uploadsPerMonth: {
      type: Number,
      required: true,
      default: 0, // 0 for free tier means no uploads allowed
    },
    maxFileSize: {
      type: Number,
      required: true,
      default: 2097152, // 2 MB default (for avatars/logos in free tier if allowed)
    },
  },
  currentUsage: {
    storage: {
      type: Number,
      default: 0,
    },
    bandwidth: {
      type: Number,
      default: 0,
    },
    uploads: {
      type: Number,
      default: 0,
    },
    billingCycleStart: {
      type: Date,
      default: Date.now,
    },
  },
  // Track per-user usage for analytics and fair usage
  userUsage: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploads: {
      type: Number,
      default: 0,
    },
    storageUsed: {
      type: Number,
      default: 0,
    },
    lastUploadAt: Date,
  }],
  status: {
    type: String,
    enum: ['active', 'exceeded', 'suspended', 'cancelled'],
    default: 'active',
  },
  // Payment tracking
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  nextBillingDate: Date,
  lastPaymentDate: Date,
  lastPaymentAmount: Number,
  // Manual approval (for initial phase)
  manuallyApproved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  notes: String, // Admin notes
}, {
  timestamps: true,
});

// Indexes
organizationBillingSchema.index({ orgId: 1 });
organizationBillingSchema.index({ plan: 1, status: 1 });
organizationBillingSchema.index({ nextBillingDate: 1 });

// Define plan limits as static configuration
organizationBillingSchema.statics.PLAN_LIMITS = {
  free: {
    storage: 0, // No image storage
    bandwidth: 0,
    uploadsPerMonth: 0,
    maxFileSize: 2 * 1024 * 1024, // 2 MB (for external links only)
    price: 0,
  },
  starter: {
    storage: 500 * 1024 * 1024, // 500 MB
    bandwidth: 5 * 1024 * 1024 * 1024, // 5 GB
    uploadsPerMonth: 1000,
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    price: 5, // $5/month
  },
  professional: {
    storage: 5 * 1024 * 1024 * 1024, // 5 GB
    bandwidth: 50 * 1024 * 1024 * 1024, // 50 GB
    uploadsPerMonth: 10000,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    price: 15, // $15/month
  },
  business: {
    storage: 50 * 1024 * 1024 * 1024, // 50 GB
    bandwidth: 500 * 1024 * 1024 * 1024, // 500 GB
    uploadsPerMonth: 100000,
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    price: 49, // $49/month
  },
  enterprise: {
    storage: 500 * 1024 * 1024 * 1024, // 500 GB (customizable)
    bandwidth: 5000 * 1024 * 1024 * 1024, // 5 TB (customizable)
    uploadsPerMonth: 1000000,
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    price: 199, // Starting at $199/month (custom pricing)
  },
};

// Method to check if organization can upload
organizationBillingSchema.methods.canUpload = function(fileSize) {
  if (this.status !== 'active') {
    return { allowed: false, reason: 'Billing status is not active' };
  }

  if (fileSize > this.limits.maxFileSize) {
    return {
      allowed: false,
      reason: `File size exceeds maximum allowed (${this.limits.maxFileSize / (1024 * 1024)} MB)`
    };
  }

  const storageRemaining = this.limits.storage - this.currentUsage.storage;
  if (storageRemaining < fileSize) {
    return {
      allowed: false,
      reason: 'Organization storage limit exceeded. Please upgrade your plan.'
    };
  }

  const uploadsRemaining = this.limits.uploadsPerMonth - this.currentUsage.uploads;
  if (uploadsRemaining <= 0) {
    return {
      allowed: false,
      reason: 'Monthly upload limit exceeded. Please upgrade your plan or wait for next billing cycle.'
    };
  }

  return { allowed: true };
};

// Method to record an upload
organizationBillingSchema.methods.recordUpload = function(userId, fileSize) {
  this.currentUsage.storage += fileSize;
  this.currentUsage.uploads += 1;

  // Update user-specific usage
  let userUsageEntry = this.userUsage.find(u => u.userId.toString() === userId.toString());

  if (!userUsageEntry) {
    userUsageEntry = {
      userId: userId,
      uploads: 0,
      storageUsed: 0,
    };
    this.userUsage.push(userUsageEntry);
  }

  userUsageEntry.uploads += 1;
  userUsageEntry.storageUsed += fileSize;
  userUsageEntry.lastUploadAt = new Date();

  // Update status based on usage
  this.updateStatus();

  return this.save();
};

// Method to update status based on current usage
organizationBillingSchema.methods.updateStatus = function() {
  if (this.status === 'suspended' || this.status === 'cancelled') {
    return;
  }

  const storageUsagePercent = this.limits.storage > 0
    ? (this.currentUsage.storage / this.limits.storage) * 100
    : 0;

  const uploadUsagePercent = this.limits.uploadsPerMonth > 0
    ? (this.currentUsage.uploads / this.limits.uploadsPerMonth) * 100
    : 0;

  if (storageUsagePercent >= 100 || uploadUsagePercent >= 100) {
    this.status = 'exceeded';
  } else {
    this.status = 'active';
  }
};

// Method to get usage statistics
organizationBillingSchema.methods.getUsageStats = function() {
  return {
    storage: {
      used: this.currentUsage.storage,
      limit: this.limits.storage,
      percentage: this.limits.storage > 0
        ? (this.currentUsage.storage / this.limits.storage) * 100
        : 0,
    },
    bandwidth: {
      used: this.currentUsage.bandwidth,
      limit: this.limits.bandwidth,
      percentage: this.limits.bandwidth > 0
        ? (this.currentUsage.bandwidth / this.limits.bandwidth) * 100
        : 0,
    },
    uploads: {
      used: this.currentUsage.uploads,
      limit: this.limits.uploadsPerMonth,
      percentage: this.limits.uploadsPerMonth > 0
        ? (this.currentUsage.uploads / this.limits.uploadsPerMonth) * 100
        : 0,
    },
    plan: this.plan,
    status: this.status,
    billingCycleStart: this.currentUsage.billingCycleStart,
  };
};

// Static method to reset monthly counters for all organizations
organizationBillingSchema.statics.resetMonthlyCounts = async function() {
  const now = new Date();
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  return this.updateMany(
    { 'currentUsage.billingCycleStart': { $lt: oneMonthAgo } },
    {
      $set: {
        'currentUsage.bandwidth': 0,
        'currentUsage.uploads': 0,
        'currentUsage.billingCycleStart': now,
        'userUsage': [], // Reset user usage tracking
      },
    }
  );
};

// Static method to upgrade organization plan
organizationBillingSchema.statics.upgradePlan = async function(orgId, newPlan, approvedBy = null) {
  const billing = await this.findOne({ orgId });

  if (!billing) {
    throw new Error('Billing record not found');
  }

  const planLimits = this.PLAN_LIMITS[newPlan];

  if (!planLimits) {
    throw new Error('Invalid plan');
  }

  billing.plan = newPlan;
  billing.limits = {
    storage: planLimits.storage,
    bandwidth: planLimits.bandwidth,
    uploadsPerMonth: planLimits.uploadsPerMonth,
    maxFileSize: planLimits.maxFileSize,
  };

  if (approvedBy) {
    billing.manuallyApproved = true;
    billing.approvedBy = approvedBy;
    billing.approvedAt = new Date();
  }

  billing.status = 'active';
  billing.nextBillingDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  return billing.save();
};

const OrganizationBilling = mongoose.model('OrganizationBilling', organizationBillingSchema);

module.exports = OrganizationBilling;
