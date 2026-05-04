import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import { upload } from "../utils/cloudinary.js";
import uploadController from "../controllers/uploadController.js";

const router = Router();
router.use(auth);

// Single file (field: "file")
router.post("/file", upload.single("file"), uploadController.uploadSingle);

// Multiple files (field: "files")
router.post("/files", upload.array("files", 10), uploadController.uploadMultiple);

// Avatar (field: "avatar")
router.post("/profile-picture", upload.single("avatar"), uploadController.uploadAvatar);

// Story media (field: "story")
router.post("/story", upload.single("story"), uploadController.uploadSingle);

// Delete by publicId
router.post("/delete", uploadController.deleteFile);

// Direct-upload signature
router.get("/signature", uploadController.getSignature);

export default router;
