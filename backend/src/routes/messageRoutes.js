// src/routes/messageRoutes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import messageController from "../controllers/messageController.js";

const router = Router();
router.use(auth);

// Threads/unread
router.get("/messages/threads", messageController.getChatThreads);
router.get("/messages/unread-count", messageController.getUnreadTotal);

// Search & create
router.get("/messages/users", messageController.getMessageableUsers);
router.post("/messages/direct", messageController.createDirectChat);
router.post("/messages/group", messageController.createGroupChat);
router.delete("/messages/:chatGroupId/members/:memberId", messageController.removeGroupMember);
router.post("/messages/:chatGroupId/members", messageController.addGroupMembers);

// Messages (CRUD-ish)
router.get("/messages/:chatGroupId", messageController.getMessages);
router.post("/messages/:chatGroupId", messageController.sendMessage);
router.put("/messages/:chatGroupId/read", messageController.markMessagesAsRead);

// Typing
router.post("/messages/:chatGroupId/typing/start", messageController.typingStart);
router.post("/messages/:chatGroupId/typing/stop", messageController.typingStop);

// Presence
router.get("/messages/:chatGroupId/presence", messageController.getChatPresence);

// Signaling
router.post("/messages/:chatGroupId/call/offer", messageController.callOffer);
router.post("/messages/:chatGroupId/call/answer", messageController.callAnswer);
router.post("/messages/:chatGroupId/call/candidate", messageController.callCandidate);
router.post("/messages/:chatGroupId/call/end", messageController.callEnd);

export default router;
