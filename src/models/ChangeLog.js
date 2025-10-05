const mongoose = require("mongoose");

const changeLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["Session", "Feature", "Case", "Feedback"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete", "feedback"],
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
