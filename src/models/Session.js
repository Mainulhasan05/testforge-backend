const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "open", "in_progress", "completed", "archived"],
      default: "draft",
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ orgId: 1, status: 1 });
sessionSchema.index({ createdBy: 1 });
sessionSchema.index({ assignees: 1 });
sessionSchema.index({ startAt: 1 });

module.exports = mongoose.model("Session", sessionSchema);
