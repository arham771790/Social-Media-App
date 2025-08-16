// routes/feedRoutes.js
import { Router } from "express";
import { getHomeFeed, getExploreFeed } from "../controllers/feedController.js";

// NOTE: swap these with your actual auth middlewares.
import { auth } from "../middlewares/auth.js"; // or whatever you use
// If you have an optional auth that only sets req.userId when present:
// import { authOptional } from "../middlewares/authOptional.js";

const router = Router();

/**
 * Home feed (requires auth)
 * GET /api/feed?page=&limit=
 */
router.get("/feed", auth, getHomeFeed);

/**
 * Explore feed (public; uses req.userId if present to compute isLiked/isBookmarked)
 * GET /api/posts/explore?page=&limit=&tag=
 */
router.get("/posts/explore", /* authOptional? */ getExploreFeed);

export default router;
