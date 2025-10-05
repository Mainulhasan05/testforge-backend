const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Case",
      required: true,
    },
    testerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    result: {
      type: String,
      enum: ["pass", "fail"],
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ caseId: 1, createdAt: -1 });
feedbackSchema.index({ testerId: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
