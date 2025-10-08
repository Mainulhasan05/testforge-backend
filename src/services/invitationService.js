const crypto = require("crypto");
const Invitation = require("../models/Invitation");
const Organization = require("../models/Organization");
const User = require("../models/User");
const emailService = require("../utils/emailService");

class InvitationService {
  async createInvitation(orgId, email, invitedBy, role = "member") {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const inviter = await User.findById(invitedBy);
    const inviterOrg = inviter.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!inviterOrg || !["owner", "admin"].includes(inviterOrg.role)) {
      throw new Error("Only owners and admins can send invitations");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isAlreadyMember = existingUser.organizations.some(
        (o) => o.orgId.toString() === orgId.toString()
      );
      if (isAlreadyMember) {
        throw new Error("User is already a member of this organization");
      }
    }

    const existingInvitation = await Invitation.findOne({
      email,
      orgId,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new Error("An active invitation already exists for this email");
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await Invitation.create({
      email,
      orgId,
      invitedBy,
      role,
      token,
      expiresAt,
    });

    await emailService.sendInvitationEmail(
      email,
      organization.name,
      inviter.fullName,
      token,
      role
    );

    return invitation;
  }

  async getOrganizationInvitations(orgId, userId, page = 1, limit = 20) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can view invitations");
    }

    const skip = (page - 1) * limit;

    const [invitations, total] = await Promise.all([
      Invitation.find({ orgId })
        .populate("invitedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invitation.countDocuments({ orgId }),
    ]);

    return { invitations, total };
  }

  async acceptInvitation(token, userId) {
    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("orgId");

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    const user = await User.findById(userId);

    if (user.email !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    const isAlreadyMember = user.organizations.some(
      (o) => o.orgId.toString() === invitation.orgId._id.toString()
    );

    if (isAlreadyMember) {
      invitation.status = "accepted";
      await invitation.save();
      throw new Error("You are already a member of this organization");
    }

    const organization = await Organization.findById(invitation.orgId);
    organization.members.push(userId);

    if (invitation.role === "owner") {
      organization.owners.push(userId);
    }

    await organization.save();

    user.organizations.push({
      orgId: invitation.orgId._id,
      role: invitation.role,
    });
    await user.save();

    invitation.status = "accepted";
    await invitation.save();

    await emailService.sendWelcomeEmail(
      user.email,
      user.fullName,
      organization.name
    );

    return {
      organization,
      role: invitation.role,
    };
  }

  async declineInvitation(token) {
    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    invitation.status = "declined";
    await invitation.save();

    return invitation;
  }

  async cancelInvitation(invitationId, userId) {
    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === invitation.orgId.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can cancel invitations");
    }

    await Invitation.findByIdAndDelete(invitationId);

    return invitation;
  }

  async resendInvitation(invitationId, userId) {
    const invitation = await Invitation.findById(invitationId)
      .populate("orgId")
      .populate("invitedBy");

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === invitation.orgId._id.toString()
    );

    if (!userOrg || !["owner", "admin"].includes(userOrg.role)) {
      throw new Error("Only owners and admins can resend invitations");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only resend pending invitations");
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    invitation.token = newToken;
    invitation.expiresAt = newExpiresAt;
    await invitation.save();

    await emailService.sendInvitationEmail(
      invitation.email,
      invitation.orgId.name,
      invitation.invitedBy.fullName,
      newToken,
      invitation.role
    );

    return invitation;
  }

  async verifyInvitationToken(token) {
    const invitation = await Invitation.findOne({
      token,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).populate("orgId");

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    return {
      email: invitation.email,
      organizationName: invitation.orgId.name,
      role: invitation.role,
    };
  }
}

module.exports = new InvitationService();
