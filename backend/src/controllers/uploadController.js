// controllers/uploadController.js
import { StatusCodes } from 'http-status-codes';
import { upload, deleteFromCloudinary, signUploadParams } from '../utils/cloudinary.js';
import { v2 as cloudinary } from 'cloudinary';

/* -----------------------
   Helpers
------------------------*/
const toError = (e) =>
  e instanceof Error ? e : new Error(typeof e === 'string' ? e : safeStringify(e));
const safeStringify = (x) => {
  try { return JSON.stringify(x); } catch { return String(x); }
};

function buildOptimizedUrl(publicId, resourceType) {
  const common = [
    { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
    { quality: 'auto' },
    { fetch_format: 'auto' }, // f_auto
  ];
  if (resourceType === 'video') {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      transformation: common,
    });
  }
  return cloudinary.url(publicId, {
    secure: true,
    transformation: common,
  });
}

function buildThumbUrl(publicId, resourceType) {
  if (resourceType === 'video') {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      secure: true,
      format: 'jpg', // video thumb
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
        { quality: 'auto' },
      ],
    });
  }
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
      { quality: 'auto' },
      { fetch_format: 'auto' },
    ],
  });
}

/* -----------------------
   SINGLE upload: field "file"
------------------------*/
export const uploadFile = async (req, res) => {
  try {
    // If route didn't attach Multer, attach here (keeps API forgiving)
    if (!req.file) {
      await new Promise((resolve, reject) =>
        upload.single('file')(req, res, (err) => (err ? reject(err) : resolve()))
      );
    }
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No file uploaded' });
    }

    // If using cloudinary storage, Multer already uploaded and gives us publicId/path
    const alreadyCloudinary = !!req.file.filename && /res\.cloudinary\.com/.test(req.file.path || '');

    let publicId, resourceType, originalUrl;

    if (alreadyCloudinary) {
      publicId = req.file.filename;
      resourceType = req.file.resource_type || (req.file.mimetype?.startsWith('video/') ? 'video' : 'image');
      originalUrl = req.file.path; // secure URL from storage
    } else {
      // Memory/Disk storage -> upload to Cloudinary now
      const opts = { folder: 'social-media-app', resource_type: 'auto' };
      let result;
      if (req.file.path) {
        result = await cloudinary.uploader.upload(req.file.path, opts);
      } else if (req.file.buffer) {
        result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(opts, (err, out) => (err ? reject(err) : resolve(out)));
          stream.end(req.file.buffer);
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'Unsupported upload source' });
      }
      publicId = result.public_id;
      resourceType = result.resource_type; // "image" | "video"
      originalUrl = result.secure_url;
    }

    const optimizedUrl = buildOptimizedUrl(publicId, resourceType);
    const thumbnailUrl = buildThumbUrl(publicId, resourceType);

    return res.status(StatusCodes.OK).json({
      data: {
        publicId,
        resourceType,
        originalUrl,
        optimizedUrl,
        thumbnailUrl,
        fileType: resourceType === 'video' ? 'video' : 'image',
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size ?? null,
      },
    });
  } catch (e) {
    console.error('uploadFile error:', e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: toError(e).message });
  }
};

/* -----------------------
   MULTIPLE upload: field "files"
------------------------*/
export const uploadMultipleFiles = async (req, res) => {
  try {
    upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        console.error('Multiple upload error:', err);
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: err.message || 'Multiple file upload failed' });
      }
      if (!req.files || req.files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No files provided' });
      }

      // With cloudinary storage, each file is already on Cloudinary
      const results = req.files.map((f) => {
        const publicId = f.filename; // cloudinary public_id
        const resourceType =
          f.resource_type || (f.mimetype?.startsWith('video/') ? 'video' : 'image');
        const originalUrl = f.path;

        return {
          publicId,
          resourceType,
          originalUrl,
          optimizedUrl: buildOptimizedUrl(publicId, resourceType),
          thumbnailUrl: buildThumbUrl(publicId, resourceType),
          fileType: resourceType === 'video' ? 'video' : 'image',
          fileName: f.originalname,
          mimeType: f.mimetype,
          fileSize: f.size || null,
        };
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `${results.length} files uploaded successfully`,
        data: results,
      });
    });
  } catch (error) {
    console.error('Multiple upload controller error:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error during multiple upload' });
  }
};

/* -----------------------
   AVATAR upload: field "avatar"
------------------------*/
export const uploadProfilePicture = async (req, res) => {
  try {
    upload.single('avatar')(req, res, async (err) => {
      if (err) {
        console.error('Profile picture upload error:', err);
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: err.message || 'Profile picture upload failed' });
      }
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No profile picture provided' });
      }
      if (!req.file.mimetype?.startsWith('image/')) {
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: 'Only image files are allowed for profile pictures' });
      }

      const publicId = req.file.filename;
      const resourceType = 'image';
      const originalUrl = req.file.path;

      const avatarUrl = cloudinary.url(publicId, {
        secure: true,
        transformation: [
          { width: 150, height: 150, crop: 'fill', gravity: 'auto' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
      const largeAvatarUrl = cloudinary.url(publicId, {
        secure: true,
        transformation: [
          { width: 300, height: 300, crop: 'fill', gravity: 'auto' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          publicId,
          resourceType,
          originalUrl,
          avatarUrl,
          largeAvatarUrl,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size || null,
        },
      });
    });
  } catch (error) {
    console.error('Profile picture upload controller error:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error during profile picture upload' });
  }
};

/* -----------------------
   STORY upload: field "story"
------------------------*/
export const uploadStoryMedia = async (req, res) => {
  try {
    upload.single('story')(req, res, async (err) => {
      if (err) {
        console.error('Story upload error:', err);
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: err.message || 'Story upload failed' });
      }
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: 'No story media provided' });
      }

      const publicId = req.file.filename;
      const resourceType =
        req.file.resource_type || (req.file.mimetype?.startsWith('video/') ? 'video' : 'image');
      const originalUrl = req.file.path;

      // 9:16 story crop for images
      const storyUrl =
        resourceType === 'video'
          ? cloudinary.url(publicId, {
              resource_type: 'video',
              secure: true,
              transformation: [
                { width: 360, height: 640, crop: 'fill', gravity: 'auto' },
                { quality: 'auto' },
              ],
            })
          : cloudinary.url(publicId, {
              secure: true,
              transformation: [
                { width: 360, height: 640, crop: 'fill', gravity: 'auto' },
                { quality: 'auto' },
                { fetch_format: 'auto' },
              ],
            });

      return res.status(StatusCodes.OK).json({
        success: true,
        message: 'Story media uploaded successfully',
        data: {
          publicId,
          resourceType,
          originalUrl,
          storyUrl,
          fileType: resourceType,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size || null,
        },
      });
    });
  } catch (error) {
    console.error('Story upload controller error:', error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal server error during story upload' });
  }
};

/* -----------------------
   DELETE by publicId
------------------------*/
export const deleteFile = async (req, res) => {
  try {
    const { publicId, resourceType = 'image' } = req.body || {};
    if (!publicId)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: 'publicId is required' });

    const result = await deleteFromCloudinary(publicId, resourceType);
    return res.status(StatusCodes.OK).json({ success: true, result });
  } catch (error) {
    console.error('Delete controller error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete file' });
  }
};

/* -----------------------
   SIGNED params (direct upload)
------------------------*/
export const getDirectUploadSignature = async (req, res) => {
  try {
    const payload = signUploadParams({ folder: 'social-media-app' });
    return res.status(StatusCodes.OK).json(payload);
  } catch (error) {
    console.error('Signature error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create signature' });
  }
};
