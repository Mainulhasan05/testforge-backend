/**
 * Seed Jira Configuration
 * Run this to set up Jira credentials for an organization
 *
 * Usage:
 *   Set JIRA_* environment variables in .env file, then run:
 *   node src/utils/seedJiraConfig.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const JiraConfig = require('../models/JiraConfig');
const User = require('../models/User');
const Organization = require('../models/Organization');

// Jira credentials from environment variables
const JIRA_CREDENTIALS = {
  jiraUrl: process.env.JIRA_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraApiToken: process.env.JIRA_API_TOKEN,
  jiraProjectKey: process.env.JIRA_PROJECT_KEY
};

// Validate required environment variables
if (!JIRA_CREDENTIALS.jiraApiToken) {
  console.error('❌ Error: JIRA_API_TOKEN environment variable is required\n');
  console.log('Please set the following in your .env file:');
  console.log('  JIRA_URL=https://your-domain.atlassian.net');
  console.log('  JIRA_EMAIL=your-email@company.com');
  console.log('  JIRA_API_TOKEN=your-api-token-here');
  console.log('  JIRA_PROJECT_KEY=YOUR_PROJECT_KEY\n');
  console.log('Get your API token from:');
  console.log('  https://id.atlassian.com/manage-profile/security/api-tokens\n');
  process.exit(1);
}

async function seedJiraConfig() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find first user and organization (or create test ones)
    let user = await User.findOne();
    let org = await Organization.findOne();

    if (!user) {
      console.error('No users found in database. Please create a user first.');
      process.exit(1);
    }

    if (!org) {
      console.error('No organizations found in database. Please create an organization first.');
      process.exit(1);
    }

    console.log(`Found user: ${user.fullName} (${user.email})`);
    console.log(`Found organization: ${org.name}`);

    // Check if config already exists
    const existingConfig = await JiraConfig.findOne({ userId: user._id, orgId: org._id });

    if (existingConfig) {
      console.log('\nJira config already exists. Updating...');

      existingConfig.jiraUrl = JIRA_CREDENTIALS.jiraUrl;
      existingConfig.jiraEmail = JIRA_CREDENTIALS.jiraEmail;
      existingConfig.jiraApiToken = JIRA_CREDENTIALS.jiraApiToken;
      existingConfig.jiraProjectKey = JIRA_CREDENTIALS.jiraProjectKey;
      existingConfig.syncEnabled = true;
      existingConfig.connectionStatus = 'active';

      await existingConfig.save();
      console.log('✓ Jira config updated successfully!');
    } else {
      console.log('\nCreating new Jira config...');

      const config = new JiraConfig({
        userId: user._id,
        orgId: org._id,
        jiraUrl: JIRA_CREDENTIALS.jiraUrl,
        jiraEmail: JIRA_CREDENTIALS.jiraEmail,
        jiraApiToken: JIRA_CREDENTIALS.jiraApiToken,
        jiraProjectKey: JIRA_CREDENTIALS.jiraProjectKey,
        syncEnabled: true,
        issueMappings: {
          priority: {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            critical: 'Highest'
          },
          issueType: 'Bug'
        },
        connectionStatus: 'active'
      });

      await config.save();
      console.log('✓ Jira config created successfully!');
    }

    console.log('\nConfiguration Details:');
    console.log('━'.repeat(60));
    console.log(`Jira URL:      ${JIRA_CREDENTIALS.jiraUrl}`);
    console.log(`Jira Email:    ${JIRA_CREDENTIALS.jiraEmail}`);
    console.log(`Project Key:   ${JIRA_CREDENTIALS.jiraProjectKey}`);
    console.log(`User ID:       ${user._id}`);
    console.log(`Organization:  ${org._id}`);
    console.log('━'.repeat(60));

    console.log('\n✅ Jira configuration seeded successfully!');
    console.log('You can now create Jira tickets from the API.');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding Jira config:', error);
    process.exit(1);
  }
}

seedJiraConfig();
