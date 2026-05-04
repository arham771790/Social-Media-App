import uploadService from '../services/UploadService.js';
import { StatusCodes } from 'http-status-codes';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class UploadController {
  uploadSingle = catchAsync(async (req, res, next) => {
    if (!req.file) {
      throw new AppError('No file uploaded', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    // Security: Validate allowed types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        throw new AppError('Invalid file type. Only JPEG, PNG, WEBP and MP4/MOV are allowed.', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const result = await uploadService.processUpload(req.file);
    res.status(StatusCodes.OK).json({ data: result });
  });

  uploadMultiple = catchAsync(async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const results = await uploadService.processMultipleUploads(req.files);
    res.status(StatusCodes.OK).json({ 
      success: true, 
      message: `${results.length} files uploaded successfully`,
      data: results 
    });
  });

  uploadAvatar = catchAsync(async (req, res, next) => {
    if (!req.file?.mimetype?.startsWith('image/')) {
      throw new AppError('Only image files are allowed for avatars', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    const result = await uploadService.processUpload(req.file);
    result.avatarUrl = uploadService.buildUrl(result.publicId, 'image', 'avatar');
    
    res.status(StatusCodes.OK).json({ success: true, data: result });
  });

  deleteFile = catchAsync(async (req, res, next) => {
    const { publicId, resourceType = 'image' } = req.body;
    if (!publicId) {
      throw new AppError('publicId is required', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    await uploadService.deleteFile(publicId, resourceType);
    res.status(StatusCodes.OK).json({ success: true });
  });

  getSignature = catchAsync(async (req, res, next) => {
    const { folder = 'social-media-app' } = req.query;
    const signature = uploadService.getSignature(folder);
    res.status(StatusCodes.OK).json(signature);
  });
}

export default new UploadController();
