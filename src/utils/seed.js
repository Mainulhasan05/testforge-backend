const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Session = require("../models/Session");
const Feature = require("../models/Feature");
const Case = require("../models/Case");
const Feedback = require("../models/Feedback");
const config = require("../config");

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();

    if (userCount > 0) {
      console.log("Database already seeded. Skipping...");
      return;
    }

    console.log("Seeding database...");

    const passwordHash = await bcrypt.hash("password123", config.bcrypt.rounds);

    const users = await User.create([
      {
        email: "owner@example.com",
        fullName: "John Owner",
        passwordHash,
        globalRole: "user",
      },
      {
        email: "admin@example.com",
        fullName: "Jane Admin",
        passwordHash,
        globalRole: "user",
      },
      {
        email: "tester1@example.com",
        fullName: "Mike Tester",
        passwordHash,
        globalRole: "user",
      },
      {
        email: "tester2@example.com",
        fullName: "Sarah Tester",
        passwordHash,
        globalRole: "user",
      },
    ]);

    const [owner, admin, tester1, tester2] = users;

    const org = await Organization.create({
      name: "Demo Organization",
      slug: "demo-organization",
      description: "This is a demo organization for testing purposes",
      owners: [owner._id],
      members: [owner._id, admin._id, tester1._id, tester2._id],
    });

    await User.updateMany(
      { _id: { $in: [owner._id, admin._id, tester1._id, tester2._id] } },
      {
        $push: {
          organizations: {
            orgId: org._id,
            role: "member",
          },
        },
      }
    );

    await User.updateOne(
      { _id: owner._id },
      {
        $set: {
          "organizations.0.role": "owner",
        },
      }
    );

    await User.updateOne(
      { _id: admin._id },
      {
        $set: {
          "organizations.0.role": "admin",
        },
      }
    );

    const session = await Session.create({
      orgId: org._id,
      createdBy: owner._id,
      title: "Q1 2025 Testing Session",
      description: "Comprehensive testing for Q1 release features",
      status: "open",
      assignees: [tester1._id, tester2._id],
      startAt: new Date("2025-01-15"),
      endAt: new Date("2025-03-31"),
      timezone: "America/New_York",
    });

    const feature1 = await Feature.create({
      sessionId: session._id,
      title: "User Authentication",
      description: "Login, signup, and password reset functionality",
      createdBy: owner._id,
    });

    const feature2 = await Feature.create({
      sessionId: session._id,
      title: "Dashboard",
      description: "Main dashboard with analytics and charts",
      createdBy: admin._id,
    });

    const case1 = await Case.create({
      featureId: feature1._id,
      title: "Login with valid credentials",
      note: "Test successful login flow",
      expectedOutput: "User should be redirected to dashboard",
      createdBy: admin._id,
      status: "completed",
    });

    const case2 = await Case.create({
      featureId: feature1._id,
      title: "Login with invalid credentials",
      note: "Test error handling for wrong password",
      expectedOutput: "Should display error message",
      createdBy: admin._id,
      status: "in_progress",
    });

    const case3 = await Case.create({
      featureId: feature2._id,
      title: "Dashboard loads correctly",
      note: "Verify all widgets render properly",
      expectedOutput: "All charts and data should be visible",
      createdBy: owner._id,
      status: "todo",
    });

    await Feedback.create([
      {
        caseId: case1._id,
        testerId: tester1._id,
        result: "pass",
        comment: "Login works perfectly with valid credentials",
      },
      {
        caseId: case1._id,
        testerId: tester2._id,
        result: "pass",
        comment: "Verified on multiple browsers",
      },
      {
        caseId: case2._id,
        testerId: tester1._id,
        result: "fail",
        comment: "Error message is not clear enough",
      },
    ]);

    console.log("Database seeded successfully!");
    console.log("\nDemo credentials:");
    console.log("Owner: owner@example.com / password123");
    console.log("Admin: admin@example.com / password123");
    console.log("Tester 1: tester1@example.com / password123");
    console.log("Tester 2: tester2@example.com / password123");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
};

module.exports = seedData;
