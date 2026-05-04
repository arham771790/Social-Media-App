import { Router } from "express";
import postController from "../controllers/postController.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

// Public routes (with optional auth for personal state)
router.get("/", auth, postController.getPosts);
router.get("/by-author/:id", auth, postController.listByAuthor);
router.get("/bookmarks", auth, postController.getBookmarks);
router.get("/:id", auth, postController.getPost);

// Protected routes
router.post("/", auth, postController.createPost);
router.put("/:id", auth, postController.updatePost);
router.delete("/:id", auth, postController.deletePost);

// Interactions
router.post("/:id/like", auth, postController.likePost);
router.post("/:id/bookmark", auth, postController.bookmarkPost);
router.post("/:id/share", auth, postController.sharePost);
router.post("/:id/reply", auth, postController.replyPost);

export default router;
