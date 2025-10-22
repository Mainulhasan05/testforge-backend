const mongoose = require('mongoose');
const crypto = require('crypto');

const jiraConfigSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Jira Connection
  jiraUrl: {
    type: String,
    required: true,
    trim: true
  },
  jiraEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  jiraApiToken: {
    type: String,
    required: true
  },
  jiraProjectKey: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },

  // Mapping Configuration
  issueMappings: {
    priority: {
      low: {
        type: String,
        default: 'Low'
      },
      medium: {
        type: String,
        default: 'Medium'
      },
      high: {
        type: String,
        default: 'High'
      },
      critical: {
        type: String,
        default: 'Highest'
      }
    },
    issueType: {
      type: String,
      default: 'Bug'
    },
    customFields: mongoose.Schema.Types.Mixed
  },

  // Sync Settings
  syncEnabled: {
    type: Boolean,
    default: true
  },
  autoCreateTickets: {
    type: Boolean,
    default: false
  },
  bidirectionalSync: {
    type: Boolean,
    default: true
  },

  // Status
  connectionStatus: {
    type: String,
    enum: ['active', 'error', 'disconnected'],
    default: 'active'
  },
  lastSyncAt: Date,
  lastError: String,

  // Security
  encryptionKey: String
}, {
  timestamps: true
});

// Compound index to ensure one config per user per org
jiraConfigSchema.index({ userId: 1, orgId: 1 }, { unique: true });

// Encrypt API token before saving
jiraConfigSchema.pre('save', function(next) {
  if (this.isModified('jiraApiToken') && !this.jiraApiToken.startsWith('encrypted:')) {
    try {
      const secret = process.env.JWT_ACCESS_SECRET || 'fallback-secret-key-32-chars!!';
      // Create a 32-byte key from the secret
      const key = crypto.createHash('sha256').update(secret).digest();
      // Generate a random IV (initialization vector)
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(this.jiraApiToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Store IV + encrypted data
      this.jiraApiToken = 'encrypted:' + iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to decrypt API token
jiraConfigSchema.methods.decryptApiToken = function() {
  if (!this.jiraApiToken.startsWith('encrypted:')) {
    return this.jiraApiToken;
  }

  try {
    const parts = this.jiraApiToken.replace('encrypted:', '').split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const secret = process.env.JWT_ACCESS_SECRET || 'fallback-secret-key-32-chars!!';
    const key = crypto.createHash('sha256').update(secret).digest();

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API token: ' + error.message);
  }
};

// Method to get safe config (without sensitive data)
jiraConfigSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
    userId: this.userId,
    orgId: this.orgId,
    jiraUrl: this.jiraUrl,
    jiraEmail: this.jiraEmail,
    jiraProjectKey: this.jiraProjectKey,
    issueMappings: this.issueMappings,
    syncEnabled: this.syncEnabled,
    autoCreateTickets: this.autoCreateTickets,
    bidirectionalSync: this.bidirectionalSync,
    connectionStatus: this.connectionStatus,
    lastSyncAt: this.lastSyncAt,
    lastError: this.lastError,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const JiraConfig = mongoose.model('JiraConfig', jiraConfigSchema);

module.exports = JiraConfig;
