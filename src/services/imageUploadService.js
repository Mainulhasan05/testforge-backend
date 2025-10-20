const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');
const Image = require('../models/Image');
const OrganizationBilling = require('../models/OrganizationBilling');
const storageAccountService = require('./storageAccountService');
const CloudinaryProvider = require('./providers/CloudinaryProvider');
const ImageKitProvider = require('./providers/ImageKitProvider');
const SirvProvider = require('./providers/SirvProvider');

class ImageUploadService {
  /**
   * Process and upload image
   * @param {Object} file - Multer file object
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(file, options = {}) {
    const {
      userId,
      orgId,
      entityType,
      entityId,
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
    } = options;

    try {
      // 1. Check organization billing and quota
      const billing = await OrganizationBilling.findOne({ orgId });

      if (!billing) {
        throw new Error('Organization billing information not found');
      }

      // Check if file size exceeds org limit before processing
      if (file.size > billing.limits.maxFileSize) {
        throw new Error(
          `File size exceeds maximum allowed (${billing.limits.maxFileSize / (1024 * 1024)} MB)`
        );
      }

      // 2. Optimize image with Sharp
      const optimizedBuffer = await this.optimizeImage(file.buffer, {
        maxWidth,
        maxHeight,
        quality,
      });

      const originalSize = file.size;
      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = originalSize / optimizedSize;

      // Get image metadata
      const metadata = await sharp(optimizedBuffer).metadata();

      // Check if org can upload this file
      const uploadCheck = billing.canUpload(optimizedSize);

      if (!uploadCheck.allowed) {
        throw new Error(uploadCheck.reason);
      }

      // 3. Select best storage account
      const storageAccount = await storageAccountService.selectBestAccount(optimizedSize);

      // 4. Upload to selected provider
      const provider = this.getProvider(storageAccount.provider, storageAccount.credentials);

      const fileName = this.generateFileName(file.originalname);
      const folder = `${orgId}/${entityType}`;

      const uploadResult = await provider.upload(optimizedBuffer, {
        fileName,
        folder,
        mimeType: file.mimetype,
        tags: [entityType, orgId.toString()],
      });

      // 5. Save image record to database
      const imageRecord = new Image({
        orgId,
        userId,
        entityType,
        entityId,
        fileName,
        originalFileName: file.originalname,
        fileSize: optimizedSize,
        originalFileSize: originalSize,
        mimeType: file.mimetype,
        width: metadata.width,
        height: metadata.height,
        provider: storageAccount.provider,
        providerAccountId: storageAccount._id,
        providerAssetId: uploadResult.assetId,
        publicUrl: uploadResult.publicUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        metadata: {
          format: metadata.format,
          hasAlpha: metadata.hasAlpha,
          isProgressive: metadata.isProgressive || false,
          compressionRatio,
        },
      });

      await imageRecord.save();

      // 6. Update storage account usage
      await storageAccount.recordUpload(optimizedSize);

      // 7. Update organization billing usage
      await billing.recordUpload(userId, optimizedSize);

      // 8. Return result
      return {
        success: true,
        image: {
          id: imageRecord._id,
          url: imageRecord.publicUrl,
          thumbnailUrl: imageRecord.thumbnailUrl,
          fileName: imageRecord.fileName,
          fileSize: imageRecord.fileSize,
          originalFileSize: imageRecord.originalFileSize,
          compressionRatio: compressionRatio.toFixed(2),
          width: imageRecord.width,
          height: imageRecord.height,
          provider: imageRecord.provider,
        },
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  }

  /**
   * Optimize image using Sharp
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Optimization options
   * @returns {Promise<Buffer>}
   */
  async optimizeImage(buffer, options = {}) {
    const { maxWidth = 2048, maxHeight = 2048, quality = 85 } = options;

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Determine output format (prefer WebP for better compression)
      let outputFormat = metadata.format;

      // Resize if needed
      let pipeline = image;

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format-specific optimization
      switch (metadata.format) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          });
          break;

        case 'png':
          pipeline = pipeline.png({
            quality,
            compressionLevel: 9,
            progressive: true,
          });
          break;

        case 'webp':
          pipeline = pipeline.webp({
            quality,
          });
          break;

        case 'gif':
          // Keep GIF as is (or convert to WebP if static)
          if (!metadata.pages || metadata.pages === 1) {
            pipeline = pipeline.webp({ quality });
          }
          break;

        default:
          // Convert to JPEG by default
          pipeline = pipeline.jpeg({
            quality,
            progressive: true,
          });
      }

      // Apply general optimizations
      pipeline = pipeline
        .withMetadata() // Preserve metadata
        .rotate(); // Auto-rotate based on EXIF

      return pipeline.toBuffer();
    } catch (error) {
      console.error('Image optimization error:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * Get provider instance
   * @param {String} providerName
   * @param {Object} credentials
   * @returns {Object} Provider instance
   */
  getProvider(providerName, credentials) {
    switch (providerName) {
      case 'cloudinary':
        return new CloudinaryProvider(credentials);
      case 'imagekit':
        return new ImageKitProvider(credentials);
      case 'sirv':
        return new SirvProvider(credentials);
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }

  /**
   * Generate unique file name
   * @param {String} originalName
   * @returns {String}
   */
  generateFileName(originalName) {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${randomStr}${ext}`;
  }

  /**
   * Delete image
   * @param {String} imageId
   * @param {String} userId
   * @returns {Promise<Object>}
   */
  async deleteImage(imageId, userId) {
    try {
      const image = await Image.findById(imageId);

      if (!image) {
        throw new Error('Image not found');
      }

      if (image.deletedAt) {
        throw new Error('Image already deleted');
      }

      // Get storage account
      const storageAccount = await storageAccountService.getAccountById(
        image.providerAccountId
      );

      if (!storageAccount) {
        throw new Error('Storage account not found');
      }

      // Delete from provider
      const provider = this.getProvider(storageAccount.provider, storageAccount.credentials);
      await provider.delete(image.providerAssetId);

      // Update storage account usage (subtract deleted file size)
      storageAccount.currentUsage.storage -= image.fileSize;
      storageAccount.currentUsage.lastUpdatedAt = new Date();
      await storageAccount.save();

      // Update organization billing
      const billing = await OrganizationBilling.findOne({ orgId: image.orgId });

      if (billing) {
        billing.currentUsage.storage -= image.fileSize;
        await billing.save();
      }

      // Soft delete image record
      await image.softDelete(userId);

      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      console.error('Image deletion error:', error);
      throw error;
    }
  }

  /**
   * Get images for an entity
   * @param {String} entityType
   * @param {String} entityId
   * @returns {Promise<Array>}
   */
  async getEntityImages(entityType, entityId) {
    return Image.getEntityImages(entityType, entityId);
  }

  /**
   * Get organization storage usage
   * @param {String} orgId
   * @returns {Promise<Object>}
   */
  async getOrganizationUsage(orgId) {
    return Image.getOrganizationUsage(orgId);
  }

  /**
   * Get user upload statistics
   * @param {String} userId
   * @param {String} orgId
   * @param {Number} days
   * @returns {Promise<Object>}
   */
  async getUserUploadStats(userId, orgId = null, days = 30) {
    return Image.getUserUploadStats(userId, orgId, days);
  }
}

module.exports = new ImageUploadService();
