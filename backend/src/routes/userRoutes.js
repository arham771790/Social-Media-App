import { Router } from "express";
import { 
  me, 
  updateProfile, 
  getUserProfile, 
  searchUsers 
} from "../controllers/userController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Get own profile (JWT required)
router.get("/me", auth, me);

// Update own profile (JWT required)
router.put("/me", auth, updateProfile);

// Search users
router.get("/search", searchUsers);

// Get public profile of any user by ID
router.get("/:id", getUserProfile);


// Get own settings (JWT required)
router.get("/me/settings", auth, getSettings);

// Update own settings (JWT required)
router.put("/me/settings", auth, updateSettings);

export default router;
