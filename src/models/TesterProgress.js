const mongoose = require("mongoose");

/**
 * TesterProgress Model
 * Tracks individual tester's progress on a session
 * Automatically updated when feedback is created/updated
 */
const testerProgressSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    testerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Overall session stats
    totalCases: {
      type: Number,
      default: 0,
    },
    testedCases: {
      type: Number,
      default: 0,
    },
    passedCases: {
      type: Number,
      default: 0,
    },
    failedCases: {
      type: Number,
      default: 0,
    },
    // Progress percentage
    progressPercentage: {
      type: Number,
      default: 0,
    },
    // Session status for this tester
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    // Timestamps
    startedAt: {
      type: Date,
      default: null,
    },
    lastTestedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    // Feature-wise breakdown
    featureProgress: [
      {
        featureId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Feature",
        },
        totalCases: {
          type: Number,
          default: 0,
        },
        testedCases: {
          type: Number,
          default: 0,
        },
        passedCases: {
          type: Number,
          default: 0,
        },
        failedCases: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Testing activity log
    activityLog: [
      {
        action: {
          type: String,
          enum: ["started", "tested_case", "updated_case", "completed"],
        },
        caseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Case",
        },
        result: {
          type: String,
          enum: ["pass", "fail"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for quick lookups
testerProgressSchema.index({ sessionId: 1, testerId: 1 }, { unique: true });
testerProgressSchema.index({ testerId: 1, status: 1 });
testerProgressSchema.index({ sessionId: 1, status: 1 });

// Method to update progress after feedback
testerProgressSchema.methods.updateProgress = function (
  caseId,
  featureId,
  result,
  isUpdate = false
) {
  // Update last tested time
  this.lastTestedAt = new Date();

  // If first test, mark as started
  if (this.status === "not_started") {
    this.status = "in_progress";
    this.startedAt = new Date();
    this.activityLog.push({
      action: "started",
      timestamp: new Date(),
    });
  }

  // Find or create feature progress
  let featureProgress = this.featureProgress.find(
    (fp) => fp.featureId.toString() === featureId.toString()
  );

  if (!featureProgress) {
    featureProgress = {
      featureId,
      totalCases: 0,
      testedCases: 0,
      passedCases: 0,
      failedCases: 0,
    };
    this.featureProgress.push(featureProgress);
  }

  // Update counts
  if (!isUpdate) {
    this.testedCases += 1;
    featureProgress.testedCases += 1;
  }

  if (result === "pass") {
    this.passedCases += isUpdate ? 0 : 1;
    featureProgress.passedCases += isUpdate ? 0 : 1;
  } else if (result === "fail") {
    this.failedCases += isUpdate ? 0 : 1;
    featureProgress.failedCases += isUpdate ? 0 : 1;
  }

  // Calculate progress percentage
  this.progressPercentage =
    this.totalCases > 0
      ? Math.round((this.testedCases / this.totalCases) * 100)
      : 0;

  // Check if completed
  if (this.testedCases >= this.totalCases && this.totalCases > 0) {
    this.status = "completed";
    this.completedAt = new Date();
    this.activityLog.push({
      action: "completed",
      timestamp: new Date(),
    });
  }

  // Add activity log
  this.activityLog.push({
    action: isUpdate ? "updated_case" : "tested_case",
    caseId,
    result,
    timestamp: new Date(),
  });

  return this.save();
};

module.exports = mongoose.model("TesterProgress", testerProgressSchema);
