import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";
import { io } from "../server.js";

/**
 * Helper: create & emit a notification
 * - Persists the row
 * - Enriches with relatedUserUsername (so frontend can link /u/<username>)
 * - Emits "notification:new" to user:<recipientId>
 *
 * Usage:
 *   await createAndEmitNotification({ recipientId, type, message, relatedUserId, relatedPostId })
 */
export const createAndEmitNotification = async ({
  recipientId,
  type,
  message,
  relatedUserId = null,
  relatedPostId = null,
}) => {
  const notification = await prisma.notification.create({
    data: { recipientId, type, message, relatedUserId, relatedPostId },
  });

  // Enrich with username for client-friendly links (/u/<username>)
  let relatedUserUsername = null;
  if (relatedUserId) {
    const u = await prisma.user.findUnique({
      where: { id: relatedUserId },
      select: { username: true },
    });
    relatedUserUsername = u?.username || null;
  }

  // Socket room: user:<recipientId>
  io.to(`user:${recipientId}`).emit("notification:new", {
    ...notification,
    relatedUserUsername, // ← important for frontend routing
  });

  return notification;
};

/**
 * GET /api/notifications?page=1&limit=20
 * Only your own notifications (latest first)
 * Enrich returned rows with relatedUserUsername for clean /u/<username> links.
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
      prisma.notification.count({ where: { recipientId: userId, read: false } }),
    ]);

    // Enrich with relatedUserUsername in one round-trip
    const ids = [...new Set(rows.map((r) => r.relatedUserId).filter(Boolean))];
    let idToUsername = {};
    if (ids.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, username: true },
      });
      idToUsername = Object.fromEntries(users.map((u) => [u.id, u.username]));
    }

    const enriched = rows.map((r) => ({
      ...r,
      relatedUserUsername: r.relatedUserId ? idToUsername[r.relatedUserId] || null : null,
    }));

    return res.status(StatusCodes.OK).json({
      notifications: enriched,
      unread,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getNotifications error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get notifications" });
  }
};

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const unread = await prisma.notification.count({
      where: { recipientId: userId, read: false },
    });
    return res.status(StatusCodes.OK).json({ unread });
  } catch (err) {
    console.error("getUnreadCount error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get unread count" });
  }
};

/**
 * POST /api/notifications        (internal/admin/dev use)
 * Body: { recipientId, type, message, relatedUserId?, relatedPostId? }
 */
export const sendNotification = async (req, res) => {
  try {
    const { recipientId, type, message, relatedUserId, relatedPostId } = req.body || {};
    if (!recipientId || !type || !message) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "recipientId, type, and message are required" });
    }
    const notif = await createAndEmitNotification({ recipientId, type, message, relatedUserId, relatedPostId });
    return res.status(StatusCodes.CREATED).json(notif);
  } catch (err) {
    console.error("sendNotification error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send notification" });
  }
};

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read (recipient only)
 */
export const markAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) return res.status(StatusCodes.NOT_FOUND).json({ error: "Notification not found" });
    if (notif.recipientId !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not allowed" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    console.error("markAsRead error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to mark notification as read" });
  }
};

/**
 * POST /api/notifications/read-bulk
 * Body: { ids: string[] }  -> marks all those owned by the user as read
 */
export const markBulkAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "ids array is required" });
    }

    const result = await prisma.notification.updateMany({
      where: { id: { in: ids }, recipientId: userId, read: false },
      data: { read: true },
    });

    return res.status(StatusCodes.OK).json({ updated: result.count });
  } catch (err) {
    console.error("markBulkAsRead error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to mark notifications as read" });
  }
};

/**
 * POST /api/notifications/mark-all-read
 * POST /api/notifications/read-all         (alias)
 * Marks ALL unread notifications (for this user) as read.
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    });
    return res.status(StatusCodes.OK).json({ updated: result.count });
  } catch (err) {
    console.error("markAllAsRead error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to mark all as read" });
  }
};
