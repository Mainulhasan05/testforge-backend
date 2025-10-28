const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Issue Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'acknowledged', 'in_progress', 'resolved', 'closed', 'wont_fix'],
    default: 'open',
    index: true
  },
  category: {
    type: String,
    enum: ['bug', 'broken_feature', 'performance', 'security', 'ui_ux', 'enhancement', 'other'],
    default: 'bug',
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Ownership
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Media Attachments
  images: [{
    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image'
    },
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Collaboration
  votes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    voteType: {
      type: String,
      enum: ['confirm', 'cannot_reproduce', 'needs_info', 'critical'],
      required: true
    },
    comment: String,
    votedAt: {
      type: Date,
      default: Date.now
    }
  }],

  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true
    },
    images: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: Date,
    edited: {
      type: Boolean,
      default: false
    }
  }],

  // Jira Integration
  jiraTicket: {
    ticketKey: String,
    ticketUrl: String,
    createdAt: Date,
    syncEnabled: {
      type: Boolean,
      default: true
    },
    lastSyncAt: Date,
    lastSyncStatus: String
  },

  // AI Generated Content
  aiGeneratedTitle: String,
  aiGeneratedDescription: String,
  aiContext: mongoose.Schema.Types.Mixed,

  // Metadata
  severity: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  impactedUsers: {
    type: Number,
    default: 0
  },
  environment: {
    type: String,
    enum: ['production', 'staging', 'development'],
    default: 'production'
  },
  browser: String,
  deviceInfo: String,

  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: String,

  // Notification tracking
  notificationsSent: [{
    sentAt: {
      type: Date,
      default: Date.now
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recipientCount: Number,
    emailSubject: String
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
issueSchema.index({ orgId: 1, status: 1 });
issueSchema.index({ orgId: 1, priority: 1 });
issueSchema.index({ orgId: 1, category: 1 });
issueSchema.index({ orgId: 1, createdAt: -1 });
issueSchema.index({ 'jiraTicket.ticketKey': 1 });

// Virtual for vote counts
issueSchema.virtual('voteStats').get(function() {
  const stats = {
    confirm: 0,
    cannot_reproduce: 0,
    needs_info: 0,
    critical: 0,
    total: this.votes.length
  };

  this.votes.forEach(vote => {
    stats[vote.voteType] = (stats[vote.voteType] || 0) + 1;
  });

  return stats;
});

// Method to calculate severity based on votes and priority
issueSchema.methods.calculateSeverity = function() {
  let severity = 5; // Base severity

  // Priority impact
  const priorityWeights = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
  };
  severity += priorityWeights[this.priority] || 0;

  // Vote impact
  const voteStats = this.voteStats;
  severity += voteStats.confirm * 0.3;
  severity += voteStats.critical * 0.5;

  // Watchers impact
  severity += Math.min(this.watchers.length * 0.2, 2);

  // Cap at 10
  this.severity = Math.min(Math.round(severity), 10);

  return this.severity;
};

// Method to check if user has voted
issueSchema.methods.hasUserVoted = function(userId) {
  return this.votes.some(vote => vote.userId.toString() === userId.toString());
};

// Method to check if user is watching
issueSchema.methods.isUserWatching = function(userId) {
  return this.watchers.some(watcher => watcher.toString() === userId.toString());
};

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;
