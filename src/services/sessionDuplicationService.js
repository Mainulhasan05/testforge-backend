const Session = require("../models/Session");
const Feature = require("../models/Feature");
const Case = require("../models/Case");
const User = require("../models/User");
const changeLogService = require("./changeLogService");

class SessionDuplicationService {
  async duplicateSession(sessionId, userId, duplicationOptions = {}) {
    const originalSession = await Session.findById(sessionId).populate("orgId");

    if (!originalSession) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === originalSession.orgId._id.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can duplicate sessions");
    }

    const {
      newTitle = `${originalSession.title} (Copy)`,
      newAssignees = [],
      includeDescription = true,
      copyStatus = "draft",
      preserveDates = false,
    } = duplicationOptions;

    const newSession = await Session.create({
      orgId: originalSession.orgId,
      createdBy: userId,
      title: newTitle,
      description: includeDescription ? originalSession.description : "",
      status: copyStatus,
      assignees: newAssignees.length > 0 ? newAssignees : [],
      startAt: preserveDates ? originalSession.startAt : null,
      endAt: preserveDates ? originalSession.endAt : null,
      timezone: originalSession.timezone,
    });

    const originalFeatures = await Feature.find({
      sessionId: originalSession._id,
    });

    const featureMapping = {};

    for (const originalFeature of originalFeatures) {
      const newFeature = await Feature.create({
        sessionId: newSession._id,
        title: originalFeature.title,
        description: originalFeature.description,
        createdBy: userId,
      });

      featureMapping[originalFeature._id.toString()] = newFeature._id;

      await changeLogService.createLog(
        "Feature",
        newFeature._id,
        "create",
        userId,
        null,
        newFeature.toObject()
      );
    }

    const originalFeatureIds = originalFeatures.map((f) => f._id);
    const originalCases = await Case.find({
      featureId: { $in: originalFeatureIds },
    });

    let totalCasesCopied = 0;

    for (const originalCase of originalCases) {
      const newFeatureId = featureMapping[originalCase.featureId.toString()];

      if (newFeatureId) {
        const newCase = await Case.create({
          featureId: newFeatureId,
          title: originalCase.title,
          note: originalCase.note,
          expectedOutput: originalCase.expectedOutput,
          createdBy: userId,
          status: "todo",
        });

        totalCasesCopied++;

        await changeLogService.createLog(
          "Case",
          newCase._id,
          "create",
          userId,
          null,
          newCase.toObject()
        );
      }
    }

    await changeLogService.createLog(
      "Session",
      newSession._id,
      "create",
      userId,
      null,
      {
        ...newSession.toObject(),
        duplicatedFrom: originalSession._id,
      }
    );

    return {
      newSession: await Session.findById(newSession._id).populate(
        "assignees",
        "fullName email"
      ),
      originalSession: {
        id: originalSession._id,
        title: originalSession.title,
      },
      statistics: {
        featuresCopied: originalFeatures.length,
        casesCopied: totalCasesCopied,
        totalFeedbackReset: 0,
      },
    };
  }

  async duplicateSessionWithCustomization(sessionId, userId, customization) {
    const {
      title,
      description,
      assignees,
      status,
      startAt,
      endAt,
      featuresToInclude,
      resetAllStatuses = true,
    } = customization;

    const originalSession = await Session.findById(sessionId).populate("orgId");

    if (!originalSession) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === originalSession.orgId._id.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can duplicate sessions");
    }

    const newSession = await Session.create({
      orgId: originalSession.orgId,
      createdBy: userId,
      title: title || `${originalSession.title} (Copy)`,
      description:
        description !== undefined ? description : originalSession.description,
      status: status || "draft",
      assignees: assignees || [],
      startAt: startAt || null,
      endAt: endAt || null,
      timezone: originalSession.timezone,
    });

    let originalFeatures;
    if (featuresToInclude && featuresToInclude.length > 0) {
      originalFeatures = await Feature.find({
        sessionId: originalSession._id,
        _id: { $in: featuresToInclude },
      });
    } else {
      originalFeatures = await Feature.find({ sessionId: originalSession._id });
    }

    const featureMapping = {};
    let totalCasesCopied = 0;

    for (const originalFeature of originalFeatures) {
      const newFeature = await Feature.create({
        sessionId: newSession._id,
        title: originalFeature.title,
        description: originalFeature.description,
        createdBy: userId,
      });

      featureMapping[originalFeature._id.toString()] = newFeature._id;

      const originalCases = await Case.find({ featureId: originalFeature._id });

      for (const originalCase of originalCases) {
        await Case.create({
          featureId: newFeature._id,
          title: originalCase.title,
          note: originalCase.note,
          expectedOutput: originalCase.expectedOutput,
          createdBy: userId,
          status: resetAllStatuses ? "todo" : originalCase.status,
        });

        totalCasesCopied++;
      }
    }

    return {
      newSession: await Session.findById(newSession._id)
        .populate("assignees", "fullName email")
        .populate("createdBy", "fullName email"),
      statistics: {
        featuresCopied: originalFeatures.length,
        casesCopied: totalCasesCopied,
      },
    };
  }

  async getSessionDuplicatePreview(sessionId, userId) {
    const session = await Session.findById(sessionId).populate("orgId");

    if (!session) {
      throw new Error("Session not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === session.orgId._id.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const features = await Feature.find({ sessionId });
    const featureIds = features.map((f) => f._id);
    const cases = await Case.find({ featureId: { $in: featureIds } });

    const featurePreview = await Promise.all(
      features.map(async (feature) => {
        const featureCases = cases.filter(
          (c) => c.featureId.toString() === feature._id.toString()
        );
        return {
          featureId: feature._id,
          title: feature.title,
          casesCount: featureCases.length,
        };
      })
    );

    return {
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        status: session.status,
        assignees: session.assignees.length,
      },
      summary: {
        totalFeatures: features.length,
        totalCases: cases.length,
        estimatedCopyTime: this.estimateCopyTime(features.length, cases.length),
      },
      features: featurePreview,
    };
  }

  estimateCopyTime(featuresCount, casesCount) {
    const baseTime = 2;
    const featureTime = featuresCount * 0.5;
    const caseTime = casesCount * 0.2;
    return `${Math.ceil(baseTime + featureTime + caseTime)} seconds`;
  }
}

module.exports = new SessionDuplicationService();
