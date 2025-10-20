require('dotenv').config();
const mongoose = require('mongoose');
const StorageAccount = require('../models/StorageAccount');
const config = require('../config');

/**
 * Seed storage accounts from environment variables
 * Run this script manually: node src/utils/seedStorageAccounts.js
 */

const seedStorageAccounts = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.
uri, 
    );
    console.log('Connected to MongoDB');

    // Clear existing accounts (optional - comment out if you want to keep existing)
    // await StorageAccount.deleteMany({});
    // console.log('Cleared existing storage accounts');

    const accounts = [];

    // Cloudinary accounts
    let index = 1;
    while (process.env[`CLOUDINARY_${index}_CLOUD_NAME`]) {
      const cloudName = process.env[`CLOUDINARY_${index}_CLOUD_NAME`];
      const apiKey = process.env[`CLOUDINARY_${index}_API_KEY`];
      const apiSecret = process.env[`CLOUDINARY_${index}_API_SECRET`];

      if (cloudName !== 'your_cloud_name') {
        accounts.push({
          provider: 'cloudinary',
          accountIdentifier: `Cloudinary Account ${index}`,
          credentials: {
            cloudName,
            apiKey,
            apiSecret,
          },
          limits: {
            storage: 25 * 1024 * 1024 * 1024, // 25 GB
            bandwidth: 25 * 1024 * 1024 * 1024, // 25 GB/month
            uploads: null, // Unlimited
            transformations: 25000, // 25k transformations/month
          },
          priority: 10 - index, // Higher priority for first accounts
        });
      }

      index++;
    }

    // ImageKit accounts
    index = 1;
    while (process.env[`IMAGEKIT_${index}_PUBLIC_KEY`]) {
      const publicKey = process.env[`IMAGEKIT_${index}_PUBLIC_KEY`];
      const privateKey = process.env[`IMAGEKIT_${index}_PRIVATE_KEY`];
      const urlEndpoint = process.env[`IMAGEKIT_${index}_URL_ENDPOINT`];

      if (publicKey !== 'your_public_key') {
        accounts.push({
          provider: 'imagekit',
          accountIdentifier: `ImageKit Account ${index}`,
          credentials: {
            publicKey,
            privateKey,
            urlEndpoint,
          },
          limits: {
            storage: 20 * 1024 * 1024 * 1024, // 20 GB
            bandwidth: 20 * 1024 * 1024 * 1024, // 20 GB/month
            uploads: null, // Unlimited
            transformations: 20000, // 20k transformations/month
          },
          priority: 10 - index,
        });
      }

      index++;
    }

    // Sirv accounts
    index = 1;
    while (process.env[`SIRV_${index}_CLIENT_ID`]) {
      const clientId = process.env[`SIRV_${index}_CLIENT_ID`];
      const clientSecret = process.env[`SIRV_${index}_CLIENT_SECRET`];

      if (clientId !== 'your_client_id') {
        accounts.push({
          provider: 'sirv',
          accountIdentifier: `Sirv Account ${index}`,
          credentials: {
            clientId,
            clientSecret,
          },
          limits: {
            storage: 500 * 1024 * 1024, // 500 MB
            bandwidth: 2 * 1024 * 1024 * 1024, // 2 GB/month
            uploads: null, // Unlimited
            transformations: null,
          },
          priority: 5 - index, // Lower priority for Sirv (smaller capacity)
        });
      }

      index++;
    }

    if (accounts.length === 0) {
      console.log('No storage accounts to seed. Please add credentials to .env file.');
      process.exit(0);
    }

    // Insert accounts
    console.log(`Seeding ${accounts.length} storage accounts...`);

    for (const accountData of accounts) {
      // Check if account already exists
      const existing = await StorageAccount.findOne({
        provider: accountData.provider,
        accountIdentifier: accountData.accountIdentifier,
      });

      if (existing) {
        console.log(`Account "${accountData.accountIdentifier}" already exists. Skipping.`);
      } else {
        const account = new StorageAccount(accountData);
        await account.save();
        console.log(`Created: ${accountData.accountIdentifier} (${accountData.provider})`);
      }
    }

    console.log('Storage accounts seeded successfully!');
    console.log('\nSummary:');
    const allAccounts = await StorageAccount.find();
    console.log(`Total accounts: ${allAccounts.length}`);

    const byProvider = allAccounts.reduce((acc, account) => {
      acc[account.provider] = (acc[account.provider] || 0) + 1;
      return acc;
    }, {});

    console.log('By provider:', byProvider);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding storage accounts:', error);
    process.exit(1);
  }
};

// Run the seed script
if (require.main === module) {
  seedStorageAccounts();
}

module.exports = seedStorageAccounts;
