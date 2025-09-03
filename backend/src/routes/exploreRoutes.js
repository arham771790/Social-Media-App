// src/routes/exploreRoutes.js
import express from "express";
import {
  getExploreFeed,
  getTrendingTags,
  getTagFeed,
  searchTags,
} from "../controllers/exploreController.js";
import {auth} from "../middlewares/auth.js"
const router = express.Router();
router.use(auth);

// Explore grid (search/sort or general)
router.get("/", getExploreFeed);

// Tag pages
router.get("/tags", getTrendingTags);      // ?limit=20 (top tags list/index)
router.get("/tags/search", searchTags);    // ?q=phot
router.get("/tags/:tag", getTagFeed);      // paged feed for a tag

export default router;
