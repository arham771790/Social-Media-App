import express from "express";
import tagController from "../controllers/tagController.js";

const router = express.Router();

router.get("/", tagController.getTags);
router.get("/popular", tagController.getPopularTags);
router.get("/:name/posts", tagController.getPostsByTag);
router.post("/", tagController.createTag);

export default router;
