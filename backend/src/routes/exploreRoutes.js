// src/routes/exploreRoutes.js
import express from "express";
import feedController from "../controllers/feedController.js";
import tagController from "../controllers/tagController.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();
router.use(auth);

// Explore grid (search/sort or general)
router.get("/", feedController.getExploreFeed);

// Tag pages
router.get("/tags", tagController.getPopularTags);
router.get("/tags/search", tagController.getTags);
router.get("/tags/:name", tagController.getPostsByTag);

export default router;
