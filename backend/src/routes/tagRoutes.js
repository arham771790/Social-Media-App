import express from "express";
import { getTags, createTag, getPopularTags, getPostsByTag } from "../controllers/tagController.js";
// import { auth, isAdmin } from "../middlewares/auth.js"; // if you later want to restrict create
const router = express.Router();

/**
 * @route GET /tags
 * @desc  List/search tags (paginated)
 */
router.get("/", getTags);

/**
 * @route GET /tags/popular
 * @desc  Top tags by usage
 */
router.get("/popular", getPopularTags);

/**
 * @route GET /tags/:name/posts
 * @desc  Posts for a tag (paginated)
 */
router.get("/:name/posts", getPostsByTag);

/**
 * @route POST /tags
 * @desc  Create a tag (idempotent)
 */
router.post("/", /* auth, isAdmin, */ createTag);

export default router;
