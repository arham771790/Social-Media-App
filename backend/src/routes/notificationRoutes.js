import express from "express";
import { auth } from "../middlewares/auth.js";
import notificationController from "../controllers/notificationController.js";

const router = express.Router();
router.use(auth);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/", notificationController.sendNotification);
router.post("/:id/read", notificationController.markAsRead);
router.post("/read-bulk", notificationController.markBulkAsRead);

// Aliases
router.post("/mark-all-read", notificationController.markAllAsRead);
router.post("/read-all", notificationController.markAllAsRead);

export default router;
