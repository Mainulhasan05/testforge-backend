const Organization = require("../models/Organization");
const User = require("../models/User");

class OrganizationService {
  async createOrganization(name, slug, ownerId) {
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
      throw new Error("Organization slug already exists");
    }

    const organization = await Organization.create({
      name,
      slug,
      owners: [ownerId],
      members: [ownerId],
    });

    await User.findByIdAndUpdate(ownerId, {
      $push: {
        organizations: {
          orgId: organization._id,
          role: "owner",
        },
      },
    });

    return organization;
  }

  async getUserOrganizations(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const orgIds = user.organizations.map((o) => o.orgId);

    const [organizations, total] = await Promise.all([
      Organization.find({ _id: { $in: orgIds } })
        .skip(skip)
        .limit(limit)
        .populate("owners", "fullName email")
        .populate("members", "fullName email")
        .sort({ createdAt: -1 }),
      Organization.countDocuments({ _id: { $in: orgIds } }),
    ]);

    const orgsWithRole = organizations.map((org) => {
      const userOrg = user.organizations.find(
        (o) => o.orgId.toString() === org._id.toString()
      );
      return {
        ...org.toObject(),
        userRole: userOrg?.role,
      };
    });

    return { organizations: orgsWithRole, total };
  }

  async getOrganizationById(orgId) {
    const organization = await Organization.findById(orgId)
      .populate("owners", "fullName email avatar")
      .populate("members", "fullName email avatar");

    if (!organization) {
      throw new Error("Organization not found");
    }

    return organization;
  }

  async updateOrganization(orgId, userId, updateData) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg || userOrg.role !== "owner") {
      throw new Error("Only owners can update organization details");
    }

    if (updateData.name) {
      organization.name = updateData.name;
    }

    if (updateData.slug) {
      const existingOrg = await Organization.findOne({
        slug: updateData.slug,
        _id: { $ne: orgId },
      });
      if (existingOrg) {
        throw new Error("Organization slug already exists");
      }
      organization.slug = updateData.slug;
    }

    await organization.save();

    return organization;
  }

  async addMember(orgId, userId, addedBy, role = "member") {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const newMember = await User.findById(userId);
    if (!newMember) {
      throw new Error("User not found");
    }

    const addingUser = await User.findById(addedBy);
    const userOrgRole = addingUser.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrgRole || !["owner", "admin"].includes(userOrgRole.role)) {
      throw new Error("Only owners and admins can add members");
    }

    if (organization.members.includes(userId)) {
      throw new Error("User is already a member");
    }

    organization.members.push(userId);

    if (role === "owner") {
      if (userOrgRole.role !== "owner") {
        throw new Error("Only owners can add other owners");
      }
      organization.owners.push(userId);
    }

    await organization.save();

    const existingUserOrg = newMember.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );
    if (!existingUserOrg) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          organizations: {
            orgId: organization._id,
            role,
          },
        },
      });
    }

    return organization;
  }

  async updateMemberRole(orgId, userId, updatedBy, newRole) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const updatingUser = await User.findById(updatedBy);
    const userOrgRole = updatingUser.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrgRole || userOrgRole.role !== "owner") {
      throw new Error("Only owners can update member roles");
    }

    if (!organization.members.includes(userId)) {
      throw new Error("User is not a member of this organization");
    }

    const member = await User.findById(userId);
    const memberOrgIndex = member.organizations.findIndex(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (memberOrgIndex === -1) {
      throw new Error("User organization data not found");
    }

    const oldRole = member.organizations[memberOrgIndex].role;
    member.organizations[memberOrgIndex].role = newRole;
    await member.save();

    if (newRole === "owner" && !organization.owners.includes(userId)) {
      organization.owners.push(userId);
      await organization.save();
    } else if (oldRole === "owner" && newRole !== "owner") {
      organization.owners = organization.owners.filter(
        (o) => o.toString() !== userId.toString()
      );
      await organization.save();
    }

    return organization;
  }

  async removeMember(orgId, userId, removedBy) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const removingUser = await User.findById(removedBy);
    const userOrgRole = removingUser.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrgRole || !["owner", "admin"].includes(userOrgRole.role)) {
      throw new Error("Only owners and admins can remove members");
    }

    if (userId.toString() === removedBy.toString()) {
      const ownerCount = organization.owners.length;
      const isLastOwner =
        organization.owners.includes(userId) && ownerCount === 1;
      if (isLastOwner) {
        throw new Error(
          "Cannot remove the last owner. Transfer ownership first."
        );
      }
    }

    const memberToRemove = await User.findById(userId);
    const memberOrgRole = memberToRemove.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (memberOrgRole?.role === "owner" && userOrgRole.role !== "owner") {
      throw new Error("Only owners can remove other owners");
    }

    organization.members = organization.members.filter(
      (m) => m.toString() !== userId.toString()
    );
    organization.owners = organization.owners.filter(
      (o) => o.toString() !== userId.toString()
    );
    await organization.save();

    await User.findByIdAndUpdate(userId, {
      $pull: {
        organizations: { orgId: organization._id },
      },
    });

    return organization;
  }

  async deleteOrganization(orgId, userId) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg || userOrg.role !== "owner") {
      throw new Error("Only owners can delete the organization");
    }

    await User.updateMany(
      { "organizations.orgId": orgId },
      { $pull: { organizations: { orgId: orgId } } }
    );

    await Organization.findByIdAndDelete(orgId);

    return organization;
  }

  async getOrganizationMembers(orgId, userId, page = 1, limit = 20) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const skip = (page - 1) * limit;
    const total = organization.members.length;

    const members = await User.find({ _id: { $in: organization.members } })
      .select("fullName email avatar organizations")
      .skip(skip)
      .limit(limit);

    const membersWithRole = members.map((member) => {
      const memberOrg = member.organizations.find(
        (o) => o.orgId.toString() === orgId.toString()
      );
      return {
        _id: member._id,
        fullName: member.fullName,
        email: member.email,
        avatar: member.avatar,
        role: memberOrg?.role || "member",
        isOwner: organization.owners.includes(member._id),
      };
    });

    return { members: membersWithRole, total };
  }

  async searchOrganizations(query, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const searchQuery = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { slug: { $regex: query, $options: "i" } },
      ],
    };

    const [organizations, total] = await Promise.all([
      Organization.find(searchQuery)
        .skip(skip)
        .limit(limit)
        .populate("owners", "fullName email")
        .sort({ createdAt: -1 }),
      Organization.countDocuments(searchQuery),
    ]);

    return { organizations, total };
  }

  async getOrganizationStats(orgId, userId) {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    const user = await User.findById(userId);
    const userOrg = user.organizations.find(
      (o) => o.orgId.toString() === orgId.toString()
    );

    if (!userOrg) {
      throw new Error("Access denied");
    }

    const Session = require("../models/Session");
    const Feature = require("../models/Feature");
    const Case = require("../models/Case");

    const [totalSessions, activeSessions, sessions] = await Promise.all([
      Session.countDocuments({ orgId }),
      Session.countDocuments({
        orgId,
        status: { $in: ["open", "in_progress"] },
      }),
      Session.find({ orgId }).select("_id"),
    ]);

    const sessionIds = sessions.map((s) => s._id);

    const [totalFeatures, features] = await Promise.all([
      Feature.countDocuments({ sessionId: { $in: sessionIds } }),
      Feature.find({ sessionId: { $in: sessionIds } }).select("_id"),
    ]);

    const featureIds = features.map((f) => f._id);

    const [totalCases, completedCases, inProgressCases] = await Promise.all([
      Case.countDocuments({ featureId: { $in: featureIds } }),
      Case.countDocuments({
        featureId: { $in: featureIds },
        status: "completed",
      }),
      Case.countDocuments({
        featureId: { $in: featureIds },
        status: "in_progress",
      }),
    ]);

    return {
      memberCount: organization.members.length,
      ownerCount: organization.owners.length,
      totalSessions,
      activeSessions,
      totalFeatures,
      totalCases,
      completedCases,
      inProgressCases,
      todoCases: totalCases - completedCases - inProgressCases,
    };
  }
}

module.exports = new OrganizationService();
