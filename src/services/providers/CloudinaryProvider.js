const cloudinary = require('cloudinary').v2;

class CloudinaryProvider {
  constructor(credentials) {
    this.cloudName = credentials.cloudName;
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;

    // Configure cloudinary instance
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
    });
  }

  /**
   * Upload image buffer to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async upload(buffer, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'testforge',
          public_id: options.fileName,
          resource_type: 'auto',
          transformation: options.transformation,
          tags: options.tags || [],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              assetId: result.public_id,
              publicUrl: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              size: result.bytes,
              thumbnailUrl: this.generateThumbnailUrl(result.public_id, result.format),
              metadata: {
                version: result.version,
                signature: result.signature,
                resourceType: result.resource_type,
              },
            });
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Delete image from Cloudinary
   * @param {String} assetId - Public ID of the image
   * @returns {Promise<Object>}
   */
  async delete(assetId) {
    try {
      const result = await cloudinary.uploader.destroy(assetId);
      return {
        success: result.result === 'ok',
        message: result.result,
      };
    } catch (error) {
      throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
  }

  /**
   * Get usage stats from Cloudinary
   * @returns {Promise<Object>}
   */
  async getUsageStats() {
    try {
      const usage = await cloudinary.api.usage();
      return {
        storage: {
          used: usage.storage.usage,
          limit: usage.storage.limit,
        },
        bandwidth: {
          used: usage.bandwidth.usage,
          limit: usage.bandwidth.limit,
        },
        transformations: {
          used: usage.transformations.usage,
          limit: usage.transformations.limit,
        },
        requests: usage.requests,
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Cloudinary usage stats: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail URL
   * @param {String} publicId
   * @param {String} format
   * @returns {String}
   */
  generateThumbnailUrl(publicId, format) {
    return cloudinary.url(publicId, {
      width: 300,
      height: 300,
      crop: 'fit',
      format: format,
    });
  }

  /**
   * Get optimized URL with transformations
   * @param {String} publicId
   * @param {Object} transformations
   * @returns {String}
   */
  getOptimizedUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto',
      ...transformations,
    });
  }
}

module.exports = CloudinaryProvider;
