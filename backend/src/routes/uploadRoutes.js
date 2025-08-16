import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../utils/cloudinary.js";
import {
  uploadFile,
  uploadMultipleFiles,
  uploadProfilePicture,
  uploadStoryMedia,
  deleteFile,
  getDirectUploadSignature,
} from "../controllers/uploadController.js";

const router = Router();

// Single file (field: "file") — FE hits /api/upload/file
router.post("/file", auth, upload.single("file"), asyncHandler(uploadFile));

// Multiple files (field: "files")
router.post("/files", auth, asyncHandler(uploadMultipleFiles));

// Avatar (field: "avatar")
router.post("/profile-picture", auth, asyncHandler(uploadProfilePicture));

// Story media (field: "story")
router.post("/story", auth, asyncHandler(uploadStoryMedia));

// Delete by publicId
router.post("/delete", auth, asyncHandler(deleteFile));

// Direct-upload signature (for unsigned/direct uploads from FE)
router.get("/signature", auth, asyncHandler(getDirectUploadSignature));

export default router;
