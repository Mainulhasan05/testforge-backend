const mongoose = require("mongoose");

const changeLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["Session", "Feature", "Case", "Feedback", "Issue", "Organization"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "feedback",
        "status_change",
        "assign",
        "comment_added",
        "comment_updated",
        "comment_deleted",
        "jira_ticket_created",
        "jira_synced",
        "jira_unlinked",
        "member_added",
        "member_removed",
        "member_role_updated"
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

changeLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
changeLogSchema.index({ performedBy: 1 });

module.exports = mongoose.model("ChangeLog", changeLogSchema);
