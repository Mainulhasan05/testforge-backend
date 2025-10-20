const axios = require('axios');
const FormData = require('form-data');

class SirvProvider {
  constructor(credentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.token = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://api.sirv.com/v2';
  }

  /**
   * Authenticate and get access token
   * @returns {Promise<String>} Access token
   */
  async authenticate() {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/token`, {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
      });

      this.token = response.data.token;
      // Token expires in 20 minutes, set expiry to 19 minutes
      this.tokenExpiry = Date.now() + 19 * 60 * 1000;

      return this.token;
    } catch (error) {
      throw new Error(`Failed to authenticate with Sirv: ${error.message}`);
    }
  }

  /**
   * Upload image buffer to Sirv
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async upload(buffer, options = {}) {
    try {
      const token = await this.authenticate();

      const folder = options.folder || '/testforge';
      const filename = options.fileName;
      const filepath = `${folder}/${filename}`;

      // Upload file via REST API
      const response = await axios.post(
        `https://api.sirv.com/v2/files/upload?filename=${encodeURIComponent(filepath)}`,
        buffer,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
          },
        }
      );

      // Get file info to get full details
      const fileInfo = await this.getFileInfo(filepath);

      return {
        assetId: filepath, // Sirv uses file path as ID
        publicUrl: `https://youraccountname.sirv.com${filepath}`, // Replace with actual account
        width: fileInfo.width || null,
        height: fileInfo.height || null,
        format: fileInfo.format || options.mimeType,
        size: fileInfo.size || buffer.length,
        thumbnailUrl: this.generateThumbnailUrl(filepath),
        metadata: {
          filepath: filepath,
          contentType: fileInfo.contentType,
        },
      };
    } catch (error) {
      throw new Error(`Failed to upload to Sirv: ${error.message}`);
    }
  }

  /**
   * Get file information
   * @param {String} filepath - File path
   * @returns {Promise<Object>}
   */
  async getFileInfo(filepath) {
    try {
      const token = await this.authenticate();

      const response = await axios.get(
        `https://api.sirv.com/v2/files/stat?filename=${encodeURIComponent(filepath)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      return {}; // Return empty object if file info not available
    }
  }

  /**
   * Delete image from Sirv
   * @param {String} assetId - File path of the image
   * @returns {Promise<Object>}
   */
  async delete(assetId) {
    try {
      const token = await this.authenticate();

      await axios.post(
        `https://api.sirv.com/v2/files/delete?filename=${encodeURIComponent(assetId)}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete from Sirv: ${error.message}`);
    }
  }

  /**
   * Get usage stats from Sirv
   * @returns {Promise<Object>}
   */
  async getUsageStats() {
    try {
      const token = await this.authenticate();

      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const account = response.data;

      return {
        storage: {
          used: account.storage?.used || 0,
          limit: 500 * 1024 * 1024, // 500 MB for free tier
        },
        bandwidth: {
          used: account.transfer?.used || 0,
          limit: 2 * 1024 * 1024 * 1024, // 2 GB
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to get Sirv usage stats: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail URL
   * @param {String} filepath - File path
   * @returns {String}
   */
  generateThumbnailUrl(filepath) {
    return `https://youraccountname.sirv.com${filepath}?w=300&h=300`;
  }

  /**
   * Get optimized URL with transformations
   * @param {String} filepath - File path
   * @param {Object} transformations
   * @returns {String}
   */
  getOptimizedUrl(filepath, transformations = {}) {
    const { width, height, quality } = transformations;
    const params = new URLSearchParams();

    if (width) params.append('w', width);
    if (height) params.append('h', height);
    if (quality) params.append('q', quality);

    const queryString = params.toString();
    return `https://youraccountname.sirv.com${filepath}${queryString ? '?' + queryString : ''}`;
  }
}

module.exports = SirvProvider;
