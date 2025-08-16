// src/routes/messageRoutes.js
// Auth-protected routes for threads, messages, and chat creation.

import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  getChatThreads,
  getUnreadTotal,
  getMessageableUsers,
  createDirectChat,
  createGroupChat,
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from "../controllers/messageController.js";

const router = express.Router();
router.use(auth); // ✅ all routes require JWT

// Threads + counts
router.get("/threads", getChatThreads);
router.get("/unread-count", getUnreadTotal);

// Search + create chats
router.get("/users", getMessageableUsers);
router.post("/direct", createDirectChat);
router.post("/group", createGroupChat);

// Messages
router.get("/:chatGroupId", getMessages);
router.post("/:chatGroupId", sendMessage);
router.put("/:chatGroupId/read", markMessagesAsRead);

export default router;
