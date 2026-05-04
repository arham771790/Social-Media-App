import { v2 as cloudinary } from 'cloudinary';
import CloudinaryStorage from 'multer-storage-cloudinary';
import multer from 'multer';
import logger from './logger.js';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

// Guard rails: fail fast if missing
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  logger.warn('[cloudinary] Missing Cloudinary env vars. Media uploads will fail.');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Multer storage
const storage = CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'social-media-app',
      resource_type: 'auto', // Cloudinary auto-detects
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv'],
      transformation: [
        { quality: 'auto' },
      ],
    };
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideo = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv'];
    if (allowedImage.includes(file.mimetype) || allowedVideo.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
  },
});

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    logger.error('Cloudinary delete error', { error: error.message, publicId });
    throw error;
  }
};

export const signUploadParams = ({ folder = 'social-media-app', eager = '' } = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  if (eager) paramsToSign.eager = eager;
  const signature = cloudinary.utils.api_sign_request(paramsToSign, CLOUDINARY_API_SECRET);
  return { 
    timestamp, 
    signature, 
    folder, 
    cloudName: CLOUDINARY_CLOUD_NAME, 
    apiKey: CLOUDINARY_API_KEY 
  };
};

export { cloudinary };
