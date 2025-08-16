// commentRoutes.js
import express from "express";
import { createComment, getComments, deleteComment } from "../controllers/commentController.js";
import { getCommentReplies } from "../controllers/commentController.js"; 
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/posts/:postId/comments", auth, createComment);
router.get("/posts/:postId/comments", getComments);

// NEW: fetch direct replies of a specific comment
router.get("/comments/:id/replies", getCommentReplies);

router.delete("/comments/:id", auth, deleteComment);

export default router;
