const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    featureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feature",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    expectedOutput: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "completed"],
      default: "todo",
    },
  },
  {
    timestamps: true,
  }
);

caseSchema.index({ featureId: 1, status: 1 });
caseSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Case", caseSchema);
