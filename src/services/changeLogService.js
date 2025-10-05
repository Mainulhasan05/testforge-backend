const ChangeLog = require("../models/ChangeLog");

class ChangeLogService {
  async createLog(
    entityType,
    entityId,
    action,
    performedBy,
    before = null,
    after = null
  ) {
    try {
      const log = await ChangeLog.create({
        entityType,
        entityId,
        action,
        performedBy,
        before,
        after,
      });
      return log;
    } catch (error) {
      console.error("Error creating changelog:", error);
      throw error;
    }
  }

  async getEntityChangeLogs(entityType, entityId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ChangeLog.find({ entityType, entityId })
        .populate("performedBy", "fullName email")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      ChangeLog.countDocuments({ entityType, entityId }),
    ]);

    return { logs, total };
  }
}

module.exports = new ChangeLogService();
