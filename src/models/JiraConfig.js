const mongoose = require('mongoose');
const crypto = require('crypto');

const jiraConfigSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
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

// Encrypt API token before saving
jiraConfigSchema.pre('save', function(next) {
  if (this.isModified('jiraApiToken') && !this.jiraApiToken.startsWith('encrypted:')) {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.JWT_ACCESS_SECRET || 'fallback-secret');
    let encrypted = cipher.update(this.jiraApiToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    this.jiraApiToken = 'encrypted:' + encrypted;
  }
  next();
});

// Method to decrypt API token
jiraConfigSchema.methods.decryptApiToken = function() {
  if (!this.jiraApiToken.startsWith('encrypted:')) {
    return this.jiraApiToken;
  }

  const encrypted = this.jiraApiToken.replace('encrypted:', '');
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.JWT_ACCESS_SECRET || 'fallback-secret');
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Method to get safe config (without sensitive data)
jiraConfigSchema.methods.toSafeObject = function() {
  return {
    _id: this._id,
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
