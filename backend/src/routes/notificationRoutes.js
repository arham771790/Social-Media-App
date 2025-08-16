import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  getNotifications,
  getUnreadCount,
  sendNotification,
  markAsRead,
  markBulkAsRead,
  markAllAsRead, // ← new
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(auth);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.post("/", sendNotification);
router.post("/:id/read", markAsRead);
router.post("/read-bulk", markBulkAsRead);

// ✅ aliases your frontend already calls
router.post("/mark-all-read", markAllAsRead);
router.post("/read-all", markAllAsRead);

export default router;
