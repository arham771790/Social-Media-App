// src/controllers/messageController.js
import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";
import { io, isUserOnline } from "../server.js";
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
      id: String(chatGroupId),
      OR: [
        { members: { some: { id: String(userId) } } },
        { admins:  { some: { id: String(userId) } } },
      ],
    },
    select: { id: true },
  });
  return !!row;
};

/* ---------------------------------------
   THREADS (Sidebar)
---------------------------------------- */

export const getChatThreads = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });

    const groups = await prisma.chatGroup.findMany({
      where: {
        OR: [
          { members: { some: { id: userId } } },
          { admins:  { some: { id: userId } } },
        ],
        archived: false,
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
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });

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
        name: g.type === "DIRECT" ? (others[0]?.username ?? g.name) : g.name,
        type: g.type, // DIRECT or GROUP
        avatar: g.type === "DIRECT" ? (others[0]?.avatar ?? null) : (g.imageUrl ?? null),
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

export const getUnreadTotal = async (req, res) => {
  try {
    const userId = req.userId;
    const total = await prisma.message.count({
      where: { senderId: { not: userId }, readBy: { none: { id: userId } } },
    });
    res.status(StatusCodes.OK).json({ total });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch unread count" });
  }
};

/* -------------------------------
   USER SEARCH + CREATE DM/GROUP
-------------------------------- */

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

export const createDirectChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Target user ID is required" });
    if (userId === targetUserId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Cannot chat with yourself" });

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, avatar: true, isPublic: true },
    });
    if (!target) return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    if (!target.isPublic) return res.status(StatusCodes.FORBIDDEN).json({ error: "Cannot message private user" });

    const [a, b] = [String(userId), String(targetUserId)].sort();
    const directKey = `${a}:${b}`;

    const existing = await prisma.chatGroup.findUnique({
      where: { directKey },
      include: { members: { select: { id: true, username: true, avatar: true } } },
    });
    if (existing) {
      return res.status(StatusCodes.OK).json({
        chatGroup: { id: existing.id, name: target.username, type: "DIRECT", avatar: target.avatar, members: existing.members },
      });
    }

    const created = await prisma.chatGroup.create({
      data: {
        type: "DIRECT",
        directKey,
        name: `Chat with ${target.username}`,
        createdBy: { connect: { id: userId } },
        members:   { connect: [{ id: userId }, { id: targetUserId }] },
        lastActivityAt: new Date(),
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

export const createGroupChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, description, memberIds, imageUrl } = req.body;

    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Group name and members required" });
    }

    const allIds = memberIds.includes(userId) ? memberIds : [userId, ...memberIds];

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

export const getMessages = async (req, res) => {
  try {
    const { chatGroupId } = req.params;
    const userId = req.userId;
    const limit  = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
    const before = req.query.before ? new Date(req.query.before) : null;

    const isMember = await ensureMembership(chatGroupId, userId);
    if (!isMember) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    const where = { chatGroupId, ...(before ? { createdAt: { lt: before } } : {}) };

    // mark unread (others) as read
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
        chatGroupId, userId, messageIds: unread.map((m) => m.id),
      });
    }

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
    const nextCursor = items.length ? items[0].createdAt : null;
    const hasMore = nextCursor
      ? (await prisma.message.count({
          where: { chatGroupId, createdAt: { lt: nextCursor } },
        })) > 0
      : false;

    res.status(StatusCodes.OK).json({ items, pageInfo: { hasMore, before: nextCursor } });
  } catch (err) {
    console.error("getMessages error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get messages" });
  }
};

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

    // Create message, then bump thread & lastMessageId
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

    await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data:  { lastActivityAt: new Date(), lastMessage: { connect: { id: message.id } } },
    });

    // socket broadcast (room == chatGroupId)
    io.to(chatGroupId).emit("message:new", { chatGroupId, message, clientTempId });

    // in-app notifications for other members
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
          message: `New message`,
          relatedUserId: userId,
          relatedPostId: null,
        })
      )
    );

    return res.status(StatusCodes.CREATED).json({ ...message, clientTempId });
  } catch (err) {
    console.error("sendMessage error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to send message" });
  }
};

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

/* -------------------------
   TYPING & PRESENCE (REST)
--------------------------*/

// Start/stop typing via REST (these simply emit socket events).
export const typingStart = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId, username } = req.body;
    if (!chatGroupId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "chatGroupId required" });

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("typing:start", { chatGroupId: String(chatGroupId), userId: String(userId), username });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "typingStart failed" });
  }
};

export const typingStop = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.body;
    if (!chatGroupId) return res.status(StatusCodes.BAD_REQUEST).json({ error: "chatGroupId required" });

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("typing:stop", { chatGroupId: String(chatGroupId), userId: String(userId) });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "typingStop failed" });
  }
};

// Query online presence of members in a chat (for "online" chips in header)
export const getChatPresence = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.params;

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    const group = await prisma.chatGroup.findUnique({
      where: { id: String(chatGroupId) },
      select: { members: { select: { id: true, username: true, avatar: true } }, admins: { select: { id: true, username: true, avatar: true } } },
    });

    const uniq = new Map();
    for (const m of [...(group?.members || []), ...(group?.admins || [])]) {
      uniq.set(m.id, m);
    }

    const users = Array.from(uniq.values()).map((u) => ({
      ...u,
      online: isUserOnline(String(u.id)),
    }));

    res.status(StatusCodes.OK).json({ users });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch presence" });
  }
};

/* -------------------------
   CALL SIGNALING (REST)
--------------------------*/

// These REST endpoints just emit the same socket events your server handles.
// Useful if you want to initiate calls via HTTP or ensure auth/membership at the API layer.

export const callOffer = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.params;
    const { sdp, fromUser } = req.body || {};
    if (!chatGroupId || !sdp) return res.status(StatusCodes.BAD_REQUEST).json({ error: "chatGroupId and sdp required" });

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("call:offer", { sdp, fromUser: fromUser || { id: userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to emit offer" });
  }
};

export const callAnswer = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.params;
    const { sdp, fromUser } = req.body || {};
    if (!chatGroupId || !sdp) return res.status(StatusCodes.BAD_REQUEST).json({ error: "chatGroupId and sdp required" });

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("call:answer", { sdp, fromUser: fromUser || { id: userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to emit answer" });
  }
};

export const callCandidate = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.params;
    const { candidate, fromUser } = req.body || {};
    if (!chatGroupId || !candidate) return res.status(StatusCodes.BAD_REQUEST).json({ error: "chatGroupId and candidate required" });

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("call:candidate", { candidate, fromUser: fromUser || { id: userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to emit candidate" });
  }
};

export const callEnd = async (req, res) => {
  try {
    const userId = req.userId;
    const { chatGroupId } = req.params;
    const { reason } = req.body || {};

    const ok = await ensureMembership(chatGroupId, userId);
    if (!ok) return res.status(StatusCodes.FORBIDDEN).json({ error: "Access denied" });

    io.to(String(chatGroupId)).emit("call:end", { reason: reason || "ended" });
    res.status(StatusCodes.OK).json({ ok: true });
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to emit call end" });
  }
};
