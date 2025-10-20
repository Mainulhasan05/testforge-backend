const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  entityType: {
    type: String,
    required: true,
    enum: ['case', 'feedback', 'feature', 'organization', 'user', 'session'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true, // in bytes
  },
  originalFileSize: {
    type: Number,
    required: true, // original size before compression
  },
  mimeType: {
    type: String,
    required: true,
  },
  width: Number,
  height: Number,
  provider: {
    type: String,
    required: true,
    enum: ['cloudinary', 'imagekit', 'sirv'],
  },
  providerAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StorageAccount',
    required: true,
  },
  providerAssetId: {
    type: String,
    required: true, // ID in the provider's system
  },
  publicUrl: {
    type: String,
    required: true, // Full URL to access the image
  },
  thumbnailUrl: String, // Optional thumbnail URL
  metadata: {
    format: String,
    hasAlpha: Boolean,
    isProgressive: Boolean,
    compressionRatio: Number, // originalSize / compressedSize
  },
  deletedAt: {
    type: Date,
    default: null, // Soft delete
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
imageSchema.index({ orgId: 1, entityType: 1, entityId: 1 });
imageSchema.index({ userId: 1 });
imageSchema.index({ provider: 1, providerAccountId: 1 });
imageSchema.index({ deletedAt: 1 });
imageSchema.index({ createdAt: -1 });

// Virtual for checking if deleted
imageSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Method to soft delete
imageSchema.methods.softDelete = function(userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get images for an entity
imageSchema.statics.getEntityImages = function(entityType, entityId, includeDeleted = false) {
  const query = { entityType, entityId };

  if (!includeDeleted) {
    query.deletedAt = null;
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get organization storage usage
imageSchema.statics.getOrganizationUsage = async function(orgId) {
  const result = await this.aggregate([
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(orgId),
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$fileSize' },
        totalImages: { $sum: 1 },
        byProvider: {
          $push: {
            provider: '$provider',
            size: '$fileSize',
          },
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      totalSize: 0,
      totalImages: 0,
      byProvider: {},
    };
  }

  const data = result[0];

  // Group by provider
  const providerStats = {};
  data.byProvider.forEach(item => {
    if (!providerStats[item.provider]) {
      providerStats[item.provider] = {
        count: 0,
        size: 0,
      };
    }
    providerStats[item.provider].count += 1;
    providerStats[item.provider].size += item.size;
  });

  return {
    totalSize: data.totalSize,
    totalImages: data.totalImages,
    byProvider: providerStats,
  };
};

// Static method to get user upload statistics
imageSchema.statics.getUserUploadStats = async function(userId, orgId = null, days = 30) {
  const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const match = {
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: null,
    createdAt: { $gte: dateLimit },
  };

  if (orgId) {
    match.orgId = new mongoose.Types.ObjectId(orgId);
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$fileSize' },
        totalImages: { $sum: 1 },
        avgCompressionRatio: { $avg: '$metadata.compressionRatio' },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      totalSize: 0,
      totalImages: 0,
      avgCompressionRatio: 0,
    };
  }

  return result[0];
};

// Method to get human-readable file size
imageSchema.methods.getReadableSize = function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  if (bytes === 0) return '0 Bytes';

  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
