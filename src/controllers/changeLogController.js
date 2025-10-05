const changeLogService = require("../services/changeLogService");
const { sendSuccess, sendError } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationMeta,
} = require("../utils/pagination");

class ChangeLogController {
  async getEntityChangeLogs(req, res, next) {
    try {
      const { entityType, entityId } = req.params;
      const { page, limit } = getPaginationParams(req.query);

      const { logs, total } = await changeLogService.getEntityChangeLogs(
        entityType,
        entityId,
        page,
        limit
      );

      const meta = getPaginationMeta(page, limit, total);

      sendSuccess(res, logs, null, meta);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChangeLogController();
