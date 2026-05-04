// routes/feedRoutes.js
import { Router } from "express";
import feedController from "../controllers/feedController.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Home feed
router.get("/feed", auth, feedController.getHomeFeed);

// Explore feed
router.get("/posts/explore", feedController.getExploreFeed);

export default router;
