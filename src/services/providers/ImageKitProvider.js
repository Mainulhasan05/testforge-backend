const ImageKit = require('imagekit');

class ImageKitProvider {
  constructor(credentials) {
    this.imagekit = new ImageKit({
      publicKey: credentials.publicKey,
      privateKey: credentials.privateKey,
      urlEndpoint: credentials.urlEndpoint,
    });
  }

  /**
   * Upload image buffer to ImageKit
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async upload(buffer, options = {}) {
    try {
      const result = await this.imagekit.upload({
        file: buffer,
        fileName: options.fileName,
        folder: options.folder || '/testforge',
        tags: options.tags || [],
        useUniqueFileName: true,
      });

      return {
        assetId: result.fileId,
        publicUrl: result.url,
        width: result.width,
        height: result.height,
        format: result.fileType,
        size: result.size,
        thumbnailUrl: result.thumbnailUrl || this.generateThumbnailUrl(result.url),
        metadata: {
          filePath: result.filePath,
          name: result.name,
          versionInfo: result.versionInfo,
        },
      };
    } catch (error) {
      throw new Error(`Failed to upload to ImageKit: ${error.message}`);
    }
  }

  /**
   * Delete image from ImageKit
   * @param {String} assetId - File ID of the image
   * @returns {Promise<Object>}
   */
  async delete(assetId) {
    try {
      await this.imagekit.deleteFile(assetId);
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete from ImageKit: ${error.message}`);
    }
  }

  /**
   * Get usage stats from ImageKit (limited API)
   * Note: ImageKit doesn't provide comprehensive usage API in free tier
   * @returns {Promise<Object>}
   */
  async getUsageStats() {
    try {
      // ImageKit doesn't provide comprehensive usage stats via API
      // We'll need to calculate from our own records
      return {
        storage: {
          used: 0, // Need to track in our DB
          limit: 20 * 1024 * 1024 * 1024, // 20 GB
        },
        bandwidth: {
          used: 0, // Need to track in our DB
          limit: 20 * 1024 * 1024 * 1024, // 20 GB
        },
        transformations: {
          used: 0, // Need to track in our DB
          limit: 20000,
        },
        lastUpdated: new Date(),
        note: 'ImageKit usage is tracked internally',
      };
    } catch (error) {
      throw new Error(`Failed to get ImageKit usage stats: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail URL
   * @param {String} url - Original URL
   * @returns {String}
   */
  generateThumbnailUrl(url) {
    // ImageKit transformation parameters
    return url + '?tr=w-300,h-300,c-at_max';
  }

  /**
   * Get optimized URL with transformations
   * @param {String} url - Original URL
   * @param {Object} transformations
   * @returns {String}
   */
  getOptimizedUrl(url, transformations = {}) {
    const { width, height, quality = 'auto', format = 'auto' } = transformations;

    let transformStr = '?tr=';
    const params = [];

    if (width) params.push(`w-${width}`);
    if (height) params.push(`h-${height}`);
    if (quality) params.push(`q-${quality}`);
    if (format && format !== 'auto') params.push(`f-${format}`);

    transformStr += params.join(',');

    return url + transformStr;
  }

  /**
   * List files in a folder
   * @param {String} path - Folder path
   * @returns {Promise<Array>}
   */
  async listFiles(path = '/testforge') {
    try {
      const result = await this.imagekit.listFiles({
        path: path,
        searchQuery: '',
        skip: 0,
        limit: 1000,
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to list ImageKit files: ${error.message}`);
    }
  }
}

module.exports = ImageKitProvider;
