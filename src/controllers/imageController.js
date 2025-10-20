const imageUploadService = require('../services/imageUploadService');
const { sendSuccess, sendError } = require('../utils/response');

// Upload single image
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 'VALIDATION_ERROR', {}, 400);
    }

    const { entityType, entityId } = req.body;

    if (!entityType || !entityId) {
      return sendError(res, 'entityType and entityId are required', 'VALIDATION_ERROR', {}, 400);
    }

    // Validate entityType
    const validEntityTypes = ['case', 'feedback', 'feature', 'organization', 'user', 'session'];
    if (!validEntityTypes.includes(entityType)) {
      return sendError(res, 'Invalid entityType', 'VALIDATION_ERROR', {}, 400);
    }

    // Get orgId from the authenticated user's context
    // This should come from the entity itself or from request
    const { orgId } = req.body;

    if (!orgId) {
      return sendError(res, 'Organization ID is required', 'VALIDATION_ERROR', {}, 400);
    }

    const result = await imageUploadService.uploadImage(req.file, {
      userId: req.user._id,
      orgId,
      entityType,
      entityId,
    });

    return sendSuccess(res, result, 'Image uploaded successfully', null, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};

// Upload multiple images
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 'No files uploaded', 'VALIDATION_ERROR', {}, 400);
    }

    const { entityType, entityId, orgId } = req.body;

    if (!entityType || !entityId || !orgId) {
      return sendError(res, 'entityType, entityId, and orgId are required', 'VALIDATION_ERROR', {}, 400);
    }

    // Validate entityType
    const validEntityTypes = ['case', 'feedback', 'feature', 'organization', 'user', 'session'];
    if (!validEntityTypes.includes(entityType)) {
      return sendError(res, 'Invalid entityType', 'VALIDATION_ERROR', {}, 400);
    }

    // Upload all files
    const uploadPromises = req.files.map(file =>
      imageUploadService.uploadImage(file, {
        userId: req.user._id,
        orgId,
        entityType,
        entityId,
      })
    );

    const results = await Promise.allSettled(uploadPromises);

    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason.message);

    return sendSuccess(
      res,
      {
        successful,
        failed,
        totalUploaded: successful.length,
        totalFailed: failed.length,
      },
      `${successful.length} images uploaded successfully`,
      null,
      201
    );
  } catch (error) {
    console.error('Multiple upload error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};

// Get images for an entity
exports.getEntityImages = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const images = await imageUploadService.getEntityImages(entityType, entityId);

    return sendSuccess(res, images, 'Images retrieved successfully');
  } catch (error) {
    console.error('Get images error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};

// Delete image
exports.deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const result = await imageUploadService.deleteImage(imageId, req.user._id);

    return sendSuccess(res, result, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete image error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};

// Get organization usage
exports.getOrganizationUsage = async (req, res) => {
  try {
    const { orgId } = req.params;

    const usage = await imageUploadService.getOrganizationUsage(orgId);

    return sendSuccess(res, usage, 'Organization usage retrieved successfully');
  } catch (error) {
    console.error('Get organization usage error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};

// Get user upload statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orgId, days = 30 } = req.query;

    const stats = await imageUploadService.getUserUploadStats(
      userId,
      orgId,
      parseInt(days)
    );

    return sendSuccess(res, stats, 'User statistics retrieved successfully');
  } catch (error) {
    console.error('Get user stats error:', error);
    return sendError(res, error.message, 'INTERNAL_ERROR', {}, 500);
  }
};
