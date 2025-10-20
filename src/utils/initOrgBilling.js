require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const OrganizationBilling = require('../models/OrganizationBilling');

async function initializeBillingForOrganizations() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all organizations
    const organizations = await Organization.find({});
    console.log(`Found ${organizations.length} organizations`);

    let created = 0;
    let existing = 0;

    for (const org of organizations) {
      // Check if billing already exists
      const existingBilling = await OrganizationBilling.findOne({ orgId: org._id });

      if (existingBilling) {
        console.log(`Billing already exists for: ${org.name}`);
        existing++;
        continue;
      }

      // Create billing with Starter plan (or Free plan if you prefer)
      await OrganizationBilling.create({
        orgId: org._id,
        plan: 'starter', // Change to 'free' if you want 0 quota
        status: 'active',
        billingCycle: 'monthly',
        approvedBy: null,
        approvedAt: new Date(),
        notes: 'Auto-initialized billing for existing organization',
      });

      console.log(`Created Starter plan billing for: ${org.name}`);
      created++;
    }

    console.log('\nBilling initialization complete!');
    console.log(`Created: ${created}`);
    console.log(`Already existed: ${existing}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing billing:', error);
    process.exit(1);
  }
}

initializeBillingForOrganizations();
