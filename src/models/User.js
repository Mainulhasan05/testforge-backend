const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    globalRole: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    organizations: [
      {
        orgId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Organization",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          required: true,
        },
      },
    ],
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// userSchema.index({ email: 1 });
userSchema.index({ "organizations.orgId": 1 });

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
