// commentRoutes.js
import express from "express";
import commentController from "../controllers/commentController.js";
import { auth } from "../middlewares/auth.js";

const router = express.Router();

router.post("/posts/:postId/comments", auth, commentController.createComment);
router.get("/posts/:postId/comments", commentController.getComments);

router.get("/comments/:id/replies", commentController.getCommentReplies);
router.delete("/comments/:id", auth, commentController.deleteComment);

export default router;
