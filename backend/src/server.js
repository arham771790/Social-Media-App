// server.js
import app from "./app.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./utils/db.js"; // for membership checks

const PORT = process.env.PORT || 4000;

// ----- Create HTTP server -----
const httpServer = createServer(app);

// ----- Allowed origins (shared format with app.js) -----
const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ----- Socket.IO -----
export const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
});

/* Optional: Redis adapter for multi-instance scaling
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();
await pub.connect(); await sub.connect();
io.adapter(createAdapter(pub, sub));
*/

// -------- Presence tracking --------
const userSockets = new Map(); // userId -> Set<socketId>
export const userSocketMap = new Map(); // userId -> last socketId

function addPresence(userId, socketId) {
  const set = userSockets.get(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
  userSocketMap.set(userId, socketId);
  if (set.size === 1) io.emit("presence:online", { userId });
}

function removePresence(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    userSockets.delete(userId);
    userSocketMap.delete(userId);
    io.emit("presence:offline", { userId });
  } else {
    const any = set.values().next().value;
    userSocketMap.set(userId, any);
  }
}

export function isUserOnline(userId) {
  const set = userSockets.get(String(userId));
  return !!(set && set.size > 0);
}

// ---- Socket auth middleware ----
io.use((socket, next) => {
  const { token } = socket.handshake.auth || {};
  if (!token) return next(new Error("unauthorized"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId || payload.id || payload.sub;
    if (!userId) return next(new Error("unauthorized"));
    socket.data.userId = String(userId);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

// ---- Helper: membership check ----
async function ensureMembership(chatGroupId, userId) {
  try {
    const row = await prisma.chatGroup.findFirst({
      where: {
        id: String(chatGroupId),
        OR: [
          { members: { some: { id: String(userId) } } },
          { admins: { some: { id: String(userId) } } },
        ],
      },
      select: { id: true },
    });
    return !!row;
  } catch {
    return false;
  }
}

// ---- Socket events ----
io.on("connection", (socket) => {
  const userId = socket.data.userId;
  if (!userId) return socket.disconnect(true);

  addPresence(userId, socket.id);
  socket.join(`user:${userId}`);

  // ---- Room join/leave ----
  socket.on("room:join", async ({ chatGroupId, roomId }, ack) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return ack?.({ ok: false, error: "invalid_room" });
    const allowed = await ensureMembership(rid, userId);
    if (!allowed) return ack?.({ ok: false, error: "forbidden" });
    socket.join(rid);
    return ack?.({ ok: true });
  });

  socket.on("room:leave", ({ chatGroupId, roomId }, ack) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return ack?.({ ok: false, error: "invalid_room" });
    socket.leave(rid);
    return ack?.({ ok: true });
  });

  // ---- Backward-compatible simple join/leave ----
  socket.on("join", async (roomId) => {
    if (!roomId) return;
    if (await ensureMembership(String(roomId), userId)) socket.join(String(roomId));
  });
  socket.on("leave", (roomId) => {
    if (roomId) socket.leave(String(roomId));
  });

  // ---- WebRTC signaling ----
  socket.on("call:ring", ({ roomId, fromUser, mode }) => {
    socket.to(roomId).emit("call:ring", { roomId, fromUser, mode });
  });

  socket.on("call:offer", ({ roomId, sdp, fromUser }) => {
    socket.to(roomId).emit("call:offer", { sdp, fromUser });
  });

  socket.on("call:answer", ({ roomId, sdp, fromUser }) => {
    socket.to(roomId).emit("call:answer", { sdp, fromUser });
  });

  socket.on("call:candidate", ({ roomId, candidate, fromUser }) => {
    socket.to(roomId).emit("call:candidate", { candidate, fromUser });
  });

  socket.on("call:end", ({ roomId, reason }) => {
    io.to(roomId).emit("call:end", { reason });
  });

  // ---- Typing events ----
  socket.on("typing:start", ({ roomId, chatGroupId, userId: uid, username }) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return;
    socket.to(rid).emit("typing:start", {
      chatGroupId: rid,
      roomId: rid,
      userId: uid || userId,
      username,
    });
  });

  socket.on("typing:stop", ({ roomId, chatGroupId, userId: uid }) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return;
    socket.to(rid).emit("typing:stop", {
      chatGroupId: rid,
      roomId: rid,
      userId: uid || userId,
    });
  });

  socket.on("disconnect", () => {
    removePresence(userId, socket.id);
  });
});

// ----- Start server -----
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
