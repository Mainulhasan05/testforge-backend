const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Upload single image
router.post(
  '/upload',
  authenticate,
  upload.single('image'),
  imageController.uploadImage
);

// Upload multiple images
router.post(
  '/upload-multiple',
  authenticate,
  upload.multiple('images', 10),
  imageController.uploadMultipleImages
);

// Get images for an entity
router.get(
  '/:entityType/:entityId',
  authenticate,
  imageController.getEntityImages
);

// Delete image
router.delete(
  '/:imageId',
  authenticate,
  imageController.deleteImage
);

// Get organization usage
router.get(
  '/usage/:orgId',
  authenticate,
  imageController.getOrganizationUsage
);

// Get user stats
router.get(
  '/stats/me',
  authenticate,
  imageController.getUserStats
);

module.exports = router;
