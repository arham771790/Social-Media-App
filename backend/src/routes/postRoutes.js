import { Router } from "express";
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  bookmarkPost,
  sharePost,
  replyPost,
  listByAuthor
} from "../controllers/postController.js";
import { auth } from "../middlewares/auth.js";

const router = Router();

router.post("/", auth, createPost);
router.get("/", getPosts);
router.get("/by-author/:id", listByAuthor);
router.get("/:id", auth, getPost);
router.put("/:id", auth, updatePost);
router.delete("/:id", auth, deletePost);
router.post("/:id/like", auth, likePost);
router.post("/:id/bookmark", auth, bookmarkPost);
router.post("/:id/share", auth, sharePost);
router.post("/:id/reply", auth, replyPost);

export default router;
