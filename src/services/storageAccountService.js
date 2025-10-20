const StorageAccount = require('../models/StorageAccount');

class StorageAccountService {
  /**
   * Select the best storage account for upload using weighted algorithm
   * @param {Number} fileSize - Size of file to upload
   * @returns {Promise<StorageAccount>} Selected account
   */
  async selectBestAccount(fileSize) {
    // 1. Get all active or near_limit accounts
    const accounts = await StorageAccount.find({
      status: { $in: ['active', 'near_limit'] },
    }).sort({ priority: -1, lastUsedAt: 1 });

    if (accounts.length === 0) {
      throw new Error('No available storage accounts. Please contact support.');
    }

    // 2. Filter accounts that can accommodate this file
    const suitableAccounts = accounts.filter(account => account.canAccommodate(fileSize));

    if (suitableAccounts.length === 0) {
      throw new Error(
        'No storage account can accommodate this file size. All accounts are at capacity.'
      );
    }

    // 3. Calculate priority scores for each account
    const scoredAccounts = suitableAccounts.map(account => {
      const availability = account.getAvailability();

      // Calculate time since last used (in days)
      const timeSinceLastUsed =
        (Date.now() - new Date(account.lastUsedAt).getTime()) / (24 * 60 * 60 * 1000);
      const recencyScore = Math.min(timeSinceLastUsed / 30, 1); // max 1 month

      // Weighted score calculation
      const priorityScore =
        0.35 * availability.storage +
        0.25 * availability.bandwidth +
        0.25 * availability.uploads +
        0.15 * recencyScore;

      return {
        account,
        score: priorityScore,
        availability,
      };
    });

    // 4. Sort by score (highest first)
    scoredAccounts.sort((a, b) => b.score - a.score);

    // 5. Select from top 3 candidates with some randomness
    // This prevents always using the same account
    const topCandidates = scoredAccounts.slice(0, Math.min(3, scoredAccounts.length));

    // Weighted random selection from top candidates
    // Higher scored accounts have higher probability
    const totalScore = topCandidates.reduce((sum, item) => sum + item.score, 0);
    let random = Math.random() * totalScore;

    for (const candidate of topCandidates) {
      random -= candidate.score;
      if (random <= 0) {
        return candidate.account;
      }
    }

    // Fallback to first candidate
    return topCandidates[0].account;
  }

  /**
   * Create a new storage account
   * @param {Object} accountData - Account data
   * @returns {Promise<StorageAccount>}
   */
  async createAccount(accountData) {
    const account = new StorageAccount(accountData);
    return account.save();
  }

  /**
   * Get all storage accounts
   * @param {Object} filters - Filters
   * @returns {Promise<Array>}
   */
  async getAllAccounts(filters = {}) {
    return StorageAccount.find(filters).sort({ priority: -1, createdAt: -1 });
  }

  /**
   * Get account by ID
   * @param {String} accountId
   * @returns {Promise<StorageAccount>}
   */
  async getAccountById(accountId) {
    return StorageAccount.findById(accountId);
  }

  /**
   * Update account
   * @param {String} accountId
   * @param {Object} updates
   * @returns {Promise<StorageAccount>}
   */
  async updateAccount(accountId, updates) {
    return StorageAccount.findByIdAndUpdate(accountId, updates, { new: true });
  }

  /**
   * Delete account
   * @param {String} accountId
   * @returns {Promise}
   */
  async deleteAccount(accountId) {
    return StorageAccount.findByIdAndDelete(accountId);
  }

  /**
   * Update account usage from provider API
   * @param {String} accountId
   * @returns {Promise<StorageAccount>}
   */
  async syncAccountUsage(accountId) {
    const account = await StorageAccount.findById(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    // Import provider dynamically
    const ProviderClass = this.getProviderClass(account.provider);
    const provider = new ProviderClass(account.credentials);

    try {
      const usage = await provider.getUsageStats();

      // Update account usage
      account.currentUsage.storage = usage.storage.used;
      account.currentUsage.bandwidth = usage.bandwidth.used;

      if (usage.transformations) {
        account.currentUsage.transformations = usage.transformations.used;
      }

      account.currentUsage.lastUpdatedAt = new Date();
      account.updateStatus();

      return account.save();
    } catch (error) {
      console.error(`Failed to sync usage for account ${accountId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync all accounts usage
   * @returns {Promise<Array>}
   */
  async syncAllAccountsUsage() {
    const accounts = await StorageAccount.find({
      status: { $ne: 'disabled' },
    });

    const results = await Promise.allSettled(
      accounts.map(account => this.syncAccountUsage(account._id))
    );

    return results.map((result, index) => ({
      accountId: accounts[index]._id,
      accountIdentifier: accounts[index].accountIdentifier,
      status: result.status,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));
  }

  /**
   * Reset monthly counters for all accounts
   * @returns {Promise}
   */
  async resetMonthlyCounts() {
    return StorageAccount.resetMonthlyCounts();
  }

  /**
   * Get provider class by name
   * @param {String} providerName
   * @returns {Class}
   */
  getProviderClass(providerName) {
    switch (providerName) {
      case 'cloudinary':
        return require('./providers/CloudinaryProvider');
      case 'imagekit':
        return require('./providers/ImageKitProvider');
      case 'sirv':
        return require('./providers/SirvProvider');
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Get usage statistics across all accounts
   * @returns {Promise<Object>}
   */
  async getOverallUsageStats() {
    const accounts = await StorageAccount.find({
      status: { $ne: 'disabled' },
    });

    const stats = {
      totalAccounts: accounts.length,
      byProvider: {},
      byStatus: {
        active: 0,
        near_limit: 0,
        exhausted: 0,
      },
      totalLimits: {
        storage: 0,
        bandwidth: 0,
      },
      totalUsage: {
        storage: 0,
        bandwidth: 0,
        uploads: 0,
      },
    };

    accounts.forEach(account => {
      // Count by status
      stats.byStatus[account.status]++;

      // Count by provider
      if (!stats.byProvider[account.provider]) {
        stats.byProvider[account.provider] = {
          count: 0,
          totalStorage: 0,
          usedStorage: 0,
        };
      }

      stats.byProvider[account.provider].count++;
      stats.byProvider[account.provider].totalStorage += account.limits.storage;
      stats.byProvider[account.provider].usedStorage += account.currentUsage.storage;

      // Total limits and usage
      stats.totalLimits.storage += account.limits.storage;
      stats.totalLimits.bandwidth += account.limits.bandwidth;
      stats.totalUsage.storage += account.currentUsage.storage;
      stats.totalUsage.bandwidth += account.currentUsage.bandwidth;
      stats.totalUsage.uploads += account.currentUsage.uploads;
    });

    // Calculate percentages
    stats.usagePercentage = {
      storage:
        stats.totalLimits.storage > 0
          ? (stats.totalUsage.storage / stats.totalLimits.storage) * 100
          : 0,
      bandwidth:
        stats.totalLimits.bandwidth > 0
          ? (stats.totalUsage.bandwidth / stats.totalLimits.bandwidth) * 100
          : 0,
    };

    return stats;
  }
}

module.exports = new StorageAccountService();
