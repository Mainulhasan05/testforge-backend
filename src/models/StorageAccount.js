const mongoose = require('mongoose');

const storageAccountSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['cloudinary', 'imagekit', 'sirv'],
  },
  accountIdentifier: {
    type: String,
    required: true,
    trim: true,
  },
  credentials: {
    // Encrypted credentials for each provider
    cloudName: String, // Cloudinary
    apiKey: String,
    apiSecret: String,
    publicKey: String, // ImageKit
    privateKey: String, // ImageKit
    urlEndpoint: String, // ImageKit
    clientId: String, // Sirv
    clientSecret: String, // Sirv
    s3Bucket: String, // Sirv S3
  },
  limits: {
    storage: {
      type: Number,
      required: true,
      default: 0, // in bytes
    },
    bandwidth: {
      type: Number,
      required: true,
      default: 0, // in bytes per month
    },
    uploads: {
      type: Number,
      default: null, // null = unlimited
    },
    transformations: {
      type: Number,
      default: null, // null = unlimited
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
    transformations: {
      type: Number,
      default: 0,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
  },
  status: {
    type: String,
    enum: ['active', 'near_limit', 'exhausted', 'disabled'],
    default: 'active',
  },
  priority: {
    type: Number,
    default: 0, // Higher number = higher priority
  },
  lastUsedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for quick lookup of active accounts
storageAccountSchema.index({ status: 1, provider: 1 });
storageAccountSchema.index({ lastUsedAt: 1 });

// Method to check if account can handle file
storageAccountSchema.methods.canAccommodate = function(fileSize) {
  const storageRemaining = this.limits.storage - this.currentUsage.storage;
  const uploadsRemaining = this.limits.uploads
    ? this.limits.uploads - this.currentUsage.uploads
    : Infinity;

  return storageRemaining >= fileSize && uploadsRemaining > 0;
};

// Method to calculate availability percentage
storageAccountSchema.methods.getAvailability = function() {
  const storageAvailability = this.limits.storage > 0
    ? (this.limits.storage - this.currentUsage.storage) / this.limits.storage
    : 1;

  const bandwidthAvailability = this.limits.bandwidth > 0
    ? (this.limits.bandwidth - this.currentUsage.bandwidth) / this.limits.bandwidth
    : 1;

  const uploadAvailability = this.limits.uploads
    ? (this.limits.uploads - this.currentUsage.uploads) / this.limits.uploads
    : 1;

  return {
    storage: storageAvailability,
    bandwidth: bandwidthAvailability,
    uploads: uploadAvailability,
    overall: (storageAvailability + bandwidthAvailability + uploadAvailability) / 3,
  };
};

// Method to update usage
storageAccountSchema.methods.recordUpload = function(fileSize) {
  this.currentUsage.storage += fileSize;
  this.currentUsage.uploads += 1;
  this.currentUsage.lastUpdatedAt = new Date();
  this.lastUsedAt = new Date();

  // Update status based on usage
  this.updateStatus();

  return this.save();
};

// Method to update status based on current usage
storageAccountSchema.methods.updateStatus = function() {
  if (this.status === 'disabled') {
    return;
  }

  const availability = this.getAvailability();
  const minAvailability = Math.min(
    availability.storage,
    availability.bandwidth,
    availability.uploads
  );

  if (minAvailability <= 0.05) {
    this.status = 'exhausted';
  } else if (minAvailability <= 0.20) {
    this.status = 'near_limit';
  } else {
    this.status = 'active';
  }
};

// Static method to reset monthly counters
storageAccountSchema.statics.resetMonthlyCounts = async function() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return this.updateMany(
    { 'currentUsage.lastResetDate': { $lt: firstDayOfMonth } },
    {
      $set: {
        'currentUsage.bandwidth': 0,
        'currentUsage.uploads': 0,
        'currentUsage.transformations': 0,
        'currentUsage.lastResetDate': now,
      },
    }
  );
};

const StorageAccount = mongoose.model('StorageAccount', storageAccountSchema);

module.exports = StorageAccount;
