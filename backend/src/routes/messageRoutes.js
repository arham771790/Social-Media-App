// src/routes/messageRoutes.js
import { Router } from "express";
import { auth } from "../middlewares/auth.js"; // must set req.userId
import {
  // Threads & unread
  getChatThreads, getUnreadTotal,
  // Search & create
  getMessageableUsers, createDirectChat, createGroupChat,removeGroupMember,addGroupMembers,
  // Messages
  getMessages, sendMessage, markMessagesAsRead,
  // Typing & presence
  typingStart, typingStop, getChatPresence,
  // Calls
  callOffer, callAnswer, callCandidate, callEnd,
} from "../controllers/messageController.js";

const router = Router();

// All routes require auth
router.use(auth);

// Threads/unread
router.get("/messages/threads", getChatThreads);
router.get("/messages/unread-count", getUnreadTotal);

// Search & create
router.get("/messages/users", getMessageableUsers);
router.post("/messages/direct", createDirectChat);
router.post("/messages/group", createGroupChat);
router.delete("/messages/:chatGroupId/members/:memberId", removeGroupMember);
router.post("/messages/:chatGroupId/members", addGroupMembers);


// Messages (CRUD-ish)
router.get("/messages/:chatGroupId", getMessages);
router.post("/messages/:chatGroupId", sendMessage);
router.put("/messages/:chatGroupId/read", markMessagesAsRead);

// Typing (emit over sockets for room)
router.post("/messages/:chatGroupId/typing/start", typingStart);
router.post("/messages/:chatGroupId/typing/stop", typingStop);

// Presence queries
router.get("/messages/:chatGroupId/presence", getChatPresence);

// Call signaling (emit over sockets for room)
router.post("/messages/:chatGroupId/call/offer", callOffer);
router.post("/messages/:chatGroupId/call/answer", callAnswer);
router.post("/messages/:chatGroupId/call/candidate", callCandidate);
router.post("/messages/:chatGroupId/call/end", callEnd);

export default router;
