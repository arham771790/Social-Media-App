import { cloudinary, deleteFromCloudinary, signUploadParams } from '../utils/cloudinary.js';
import logger from '../utils/logger.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

class UploadService {
  async processUpload(file) {
    if (!file) {
      throw new AppError('No file provided', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const publicId = file.filename; // From multer-storage-cloudinary
    const resourceType = file.resource_type || (file.mimetype?.startsWith('video/') ? 'video' : 'image');
    const originalUrl = file.path;

    return {
      publicId,
      resourceType,
      originalUrl,
      optimizedUrl: this.buildUrl(publicId, resourceType, 'optimized'),
      thumbnailUrl: this.buildUrl(publicId, resourceType, 'thumb'),
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async processMultipleUploads(files) {
    if (!files || files.length === 0) {
      throw new AppError('No files provided', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    return Promise.all(files.map(file => this.processUpload(file)));
  }

  async deleteFile(publicId, resourceType) {
    try {
      return await deleteFromCloudinary(publicId, resourceType);
    } catch (error) {
       throw new AppError('Failed to delete file from storage', StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }
  }

  getSignature(folder) {
    return signUploadParams({ folder });
  }

  buildUrl(publicId, resourceType, type) {
    const transformations = {
      optimized: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
      thumb: [
        { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
      avatar: [
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    };

    return cloudinary.url(publicId, {
      secure: true,
      resource_type: resourceType,
      transformation: transformations[type] || transformations.optimized,
    });
  }
}

export default new UploadService();
