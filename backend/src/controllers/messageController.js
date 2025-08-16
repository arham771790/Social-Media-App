// src/controllers/messageController.js
// Handles: threads (sidebar), messages CRUD (read/send/mark read),
// user search, create DM/group, and realtime emits.

import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";
import { io } from "../server.js";
import { createAndEmitNotification } from "./notificationController.js";

/** Infer message type from media URL so UI can render appropriately. */
const inferMessageType = (mediaUrl) => {
  if (!mediaUrl) return "TEXT";
  const s = String(mediaUrl).toLowerCase();
  if (/\.(mp4|mov|mkv|webm)$/.test(s)) return "VIDEO";
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(s)) return "IMAGE";
  return "FILE";
};

/** Confirm the requesting user belongs to the chatGroup. */
const ensureMembership = async (chatGroupId, userId) => {
  const row = await prisma.chatGroup.findFirst({
    where: {
      id: chatGroupId,
      OR: [
        { members: { some: { id: userId } } },
        { admins:  { some: { id: userId } } },
      ],
    },
    select: { id: true },
  });
  return !!row;
};

/* ---------------------------------------
   THREADS (Sidebar) – ordered server-side
---------------------------------------- */
/**
 * GET /api/messages/threads
 * Returns all threads the user participates in, ordered by lastActivityAt DESC.
 * Provides lastMessage preview + per-thread unread + totalUnread.
 */
// src/controllers/messageController.js

export const getChatThreads = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
    }

    const groups = await prisma.chatGroup.findMany({
      where: {
        OR: [
          { members: { some: { id: userId } } },
          { admins:  { some: { id: userId } } },
        ],
        // if you added archived: false, include it here
      },
      include: {
        members:  { select: { id: true, username: true, avatar: true } },
        admins:   { select: { id: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, username: true, avatar: true } } },
        },
      },
      // order primarily by lastActivityAt; fall back just in case
      orderBy: [
        { lastActivityAt: "desc" },
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    // unread per-thread for this user
    const unreadCounts = await Promise.all(
      groups.map((g) =>
        prisma.message.count({
          where: {
            chatGroupId: g.id,
            senderId: { not: userId },
            readBy: { none: { id: userId } },
          },
        })
      )
    );

    const threads = groups.map((g, i) => {
      const last = g.messages[0] || null;
      const others = g.members.filter((m) => m.id !== userId);
      return {
        id: g.id,
        name: g.type === "DIRECT"
          ? (others[0]?.username ?? g.name)
          : g.name,
        type: g.type, // DIRECT or GROUP
        avatar: g.type === "DIRECT"
          ? (others[0]?.avatar ?? null)
          : (g.imageUrl ?? null),
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              type: last.type,
              sender: last.sender,
              timestamp: last.createdAt,
            }
          : null,
        unread: unreadCounts[i] || 0,
        members: g.members.map((m) => ({ id: m.id, username: m.username, avatar: m.avatar })),
        createdAt: g.createdAt,
      };
    });

    const totalUnread = unreadCounts.reduce((a, b) => a + b, 0);
    return res.status(StatusCodes.OK).json({ threads, totalUnread });
  } catch (err) {
    console.error("getChatThreads error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get chat threads" });
  }
};


/**
 * GET /api/messages/unread-count
 * Total unread across all threads for header badge.
 */
export const getUnreadTotal = async (req, res) => {
  try {
    const userId = req.userId;
    const total = await prisma.message.count({
      where: {
        senderId: { not: userId },
        readBy: { none: { id: userId } },
      },
    });
    res.status(StatusCodes.OK).json({ total });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch unread count" });
  }
};

/* -------------------------------
   USER SEARCH + CREATE DM/GROUP
-------------------------------- */
/**
 * GET /api/messages/users?search=
 * Returns public users you can DM (excluding yourself).
 */
export const getMessageableUsers = async (req, res) => {
  try {
    const userId = req.userId;
    const { search } = req.query;

    const where = { isPublic: true, id: { not: userId } };
    if (search) where.username = { contains: search, mode: "insensitive" };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, username: true, avatar: true, bio: true },
      orderBy: { username: "asc" },
    });

    res.status(StatusCodes.OK).json(users);
  } catch (err) {
    console.error("getMessageableUsers error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get users" });
  }
};

/**
 * POST /api/messages/direct
 * Body: { targetUserId }
 * Creates or returns an existing DIRECT chat (unique per pair via directKey).
 */
export const createDirectChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.body;

    if (!targetUserId)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Target user ID is required" });
    if (userId === targetUserId)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Cannot chat with yourself" });

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, avatar: true, isPublic: true },
    });
    if (!target) return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    if (!target.isPublic)
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Cannot message private user" });

    // enforce single DM with a deterministic directKey "<min>:<max>"
    const [a, b] = [String(userId), String(targetUserId)].sort();
    const directKey = `${a}:${b}`;

    const existing = await prisma.chatGroup.findUnique({
      where: { directKey },
      include: { members: { select: { id: true, username: true, avatar: true } } },
    });
    if (existing) {
      return res.status(StatusCodes.OK).json({
        chatGroup: {
          id: existing.id,
          name: target.username,
          type: "DIRECT",
          avatar: target.avatar,
          members: existing.members,
        },
      });
    }

    const created = await prisma.chatGroup.create({
      data: {
        type: "DIRECT",
        directKey,
        name: `Chat with ${target.username}`,
        createdBy: { connect: { id: userId } },
        members:   { connect: [{ id: userId }, { id: targetUserId }] },
        lastActivityAt: new Date(), // so it shows at top instantly
      },
      include: { members: { select: { id: true, username: true, avatar: true } } },
    });

    res.status(StatusCodes.CREATED).json({
      chatGroup: {
        id: created.id,
        name: target.username,
        type: "DIRECT",
        avatar: target.avatar,
        members: created.members,
      },
    });
  } catch (err) {
    console.error("createDirectChat error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create direct chat" });
  }
};

/**
 * POST /api/messages/group
 * Body: { name, description?, memberIds: string[], imageUrl? }
 * Creates a GROUP chat; requester becomes admin automatically.
 */
export const createGroupChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, memberIds, imageUrl } = req.body;

    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Group name and members required" });
    }

    // ensure creator is in member list
    const allIds = memberIds.includes(userId) ? memberIds : [userId, ...memberIds];

    // only allow public users for now
    const users = await prisma.user.findMany({
      where: { id: { in: allIds }, isPublic: true },
      select: { id: true },
    });
    if (users.length !== allIds.length) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Some users invalid" });
    }

    const g = await prisma.chatGroup.create({
      data: {
        type: "GROUP",
        name, description, imageUrl,
        createdBy: { connect: { id: userId } },
        admins:    { connect: { id: userId } },
        members:   { connect: allIds.map((id) => ({ id })) },
        lastActivityAt: new Date(),
      },
      include: {
        members: { select: { id: true, username: true, avatar: true } },
        admins:  { select: { id: true, username: true, avatar: true } },
      },
    });

    res.status(StatusCodes.CREATED).json({
      chatGroup: {
        id: g.id,
        name: g.name,
        type: "GROUP",
        avatar: g.imageUrl,
        members: g.members,
        admins: g.admins,
        description: g.description,
      },
    });
  } catch (err) {
    console.error("createGroupChat error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create group chat" });
  }
};

/* ----------------
   MESSAGES (CRUD)
----------------- */
/**
 * GET /api/messages/:chatGroupId?limit=50&before=<ISO>
 * Paginates messages newest→older; also marks sender≠me as read (server emits 'messages:read').
 */
export const getMessages = async (req, res) => {
  try {
    const { chatGroupId } = req.params;
    const userId = req.userId;
    const limit  = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const isMember = await ensureMembership(chatGroupId, userId);
    if (!isMember) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    const where = { chatGroupId, ...(before ? { createdAt: { lt: before } } : {}) };

    // mark all unread (from others) as read
    const unread = await prisma.message.findMany({
      where: { chatGroupId, senderId: { not: userId }, readBy: { none: { id: userId } } },
      select: { id: true },
    });
    if (unread.length) {
      await prisma.$transaction(
        unread.map((m) =>
          prisma.message.update({
            where: { id: m.id },
            data:  { readBy: { connect: { id: userId } } },
          })
        )
      );
      // realtime read-receipts
      io.to(chatGroupId).emit("messages:read", {
        chatGroupId, userId, messageIds: unread.map((m) => m.id),
      });
    }

    // load page (desc → reverse to asc for display)
    const rowsDesc = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        readBy: { select: { id: true } },
      },
    });

    const items = rowsDesc.reverse();
    const hasMore =
      items.length === limit
        ? (await prisma.message.count({
            where: { chatGroupId, createdAt: { lt: items[0].createdAt } },
          })) > 0
        : false;

    res.status(StatusCodes.OK).json({
      items,
      pageInfo: { hasMore, before: items[0]?.createdAt || null },
    });
  } catch (err) {
    console.error("getMessages error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get messages" });
  }
};

/**
 * POST /api/messages/:chatGroupId
 * Body: { content?, mediaUrl?, clientTempId? }
 * Persists the message, bumps lastActivityAt, emits 'message:new',
 * and creates in-app notifications for all other members.
 */
export const sendMessage = async (req, res) => {
  try {
    const { chatGroupId } = req.params;
    const userId = req.userId;
    const { content, mediaUrl, clientTempId } = req.body || {};

    if (!content && !mediaUrl) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Message content or media is required" });
    }

    const isMember = await ensureMembership(chatGroupId, userId);
    if (!isMember) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied to this chat" });

    const type = inferMessageType(mediaUrl);

    const message = await prisma.message.create({
      data: {
        content:  content || null,
        mediaUrl: mediaUrl || null,
        type,
        sender:    { connect: { id: userId } },
        chatGroup: { connect: { id: chatGroupId } },
        readBy:    { connect: { id: userId } }, // sender auto-reads
      },
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        readBy: { select: { id: true } },
      },
    });

    // keep thread fresh for server-side ordering
    await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data:  { lastActivityAt: new Date() },
    });

    // realtime broadcast (room == chatGroupId); include clientTempId for optimistic reconcile
    io.to(chatGroupId).emit("message:new", { chatGroupId, message, clientTempId });

    // create in-app notifications for all other participants (works for offline too)
    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      select: { members: { select: { id: true } }, admins: { select: { id: true } } },
    });
    const recipientIds = [
      ...(group?.members || []).map((m) => m.id),
      ...(group?.admins  || []).map((a) => a.id),
    ]
      .filter((id) => id !== userId)
      .filter((v, i, a) => a.indexOf(v) === i);

    await Promise.all(
      recipientIds.map((rid) =>
        createAndEmitNotification({
          recipientId: rid,
          type: "MESSAGE",
          message: `New message from @${message.sender.username}`,
          relatedUserId: userId,
          relatedPostId: null,
        })
      )
    );

    // also respond via HTTP (belt & suspenders in case socket echo is missed)
    return res.status(StatusCodes.CREATED).json({ ...message, clientTempId });
  } catch (err) {
    console.error("sendMessage error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send message" });
  }
};

/**
 * PUT /api/messages/:chatGroupId/read
 * Marks all unread messages from others as read and emits 'messages:read'.
 */
export const markMessagesAsRead = async (req, res) => {
  try {
    const { chatGroupId } = req.params;
    const userId = req.userId;

    const isMember = await ensureMembership(chatGroupId, userId);
    if (!isMember) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    const unread = await prisma.message.findMany({
      where: { chatGroupId, senderId: { not: userId }, readBy: { none: { id: userId } } },
      select: { id: true },
    });
    if (unread.length) {
      await prisma.$transaction(
        unread.map((m) =>
          prisma.message.update({
            where: { id: m.id },
            data:  { readBy: { connect: { id: userId } } },
          })
        )
      );
      io.to(chatGroupId).emit("messages:read", {
        chatGroupId,
        userId,
        messageIds: unread.map((m) => m.id),
      });
    }

    res.status(StatusCodes.OK).json({ ok: true });
  } catch (err) {
    console.error("markMessagesAsRead error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to mark read" });
  }
};
