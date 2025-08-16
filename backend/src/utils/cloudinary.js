import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

// Guard rails: fail fast if missing (devs will see console)
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('[cloudinary] Missing Cloudinary env vars. Check .env');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Multer storage (uploads go directly to Cloudinary)
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Put everything in one folder; you can split by user later (e.g. `social-media-app/${req.userId}`)
    return {
      folder: 'social-media-app',
      // Let Cloudinary infer resource_type, or set explicitly by mimetype
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      // Keep filename readable-ish (Cloudinary will uniquify)
      public_id: undefined,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv'],
      transformation: [
        { quality: 'auto' }, // server-side base optimization
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

/**
 * Build an optimized Cloudinary URL from a publicId.
 * NOTE: use file.filename (public_id) from multer-storage-cloudinary.
 */
export const getOptimizedUrl = (
  publicId,
  {
    resourceType = 'image', // 'image' | 'video' | 'raw'
    width,
    height,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = {}
) => {
  if (!publicId) return null;

  const options = {
    resource_type: resourceType,
    transformation: [],
    format,
  };

  if (width || height) {
    options.transformation.push({ width, height, crop });
  }
  if (quality) {
    options.transformation.push({ quality });
  }

  return cloudinary.url(publicId, options);
};

/** Delete by public_id */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  return result;
};

/**
 * Generate a signed payload for **direct** uploads from the frontend.
 * Frontend can call Cloudinary upload API with this signature — your server never handles the file bytes.
 */
export const signUploadParams = ({ folder = 'social-media-app', eager = '' } = {}) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  if (eager) paramsToSign.eager = eager;
  const signature = cloudinary.utils.api_sign_request(paramsToSign, CLOUDINARY_API_SECRET);
  return { timestamp, signature, folder, cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY };
};

export { cloudinary };
