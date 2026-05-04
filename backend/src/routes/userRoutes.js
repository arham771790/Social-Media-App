import { Router } from "express";
import userController from "../controllers/userController.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Own profile
router.get("/me", auth, userController.me);
router.put("/me", auth, userController.updateProfile);

// Own settings
router.get("/me/settings", auth, userController.getSettings);
router.put("/me/settings", auth, userController.updateSettings);

// Search
router.get("/search", userController.searchUsers);

// Public profiles
router.get("/username/:username", userController.getUserByUsername);
router.get("/:id", userController.getUserProfile);

export default router;
