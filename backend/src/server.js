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
const allowedOrigins = (  "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// ----- Socket.IO -----
export const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
});

/*
// (Optional) Multi-instance scaling via Redis adapter
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
const pub = createClient({ url: process.env.REDIS_URL });
const sub = pub.duplicate();
await pub.connect(); await sub.connect();
io.adapter(createAdapter(pub, sub));
*/

// -------- Presence tracking --------
// Support multiple tabs/devices per user.
// userId -> Set<socketId>
const userSockets = new Map();
// Keep last-known socketId (legacy helper export)
export const userSocketMap = new Map(); // userId -> last socketId

function addPresence(userId, socketId) {
  const set = userSockets.get(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
  userSocketMap.set(userId, socketId);
  if (set.size === 1) io.emit("presence:online", { userId }); // first connection → online
}

function removePresence(userId, socketId) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) {
    userSockets.delete(userId);
    userSocketMap.delete(userId);
    io.emit("presence:offline", { userId }); // last connection closed → offline
  } else {
    // refresh last socket reference (pick any remaining)
    const any = set.values().next().value;
    userSocketMap.set(userId, any);
  }
}

// Helper other modules can use
export function isUserOnline(userId) {
  const set = userSockets.get(String(userId));
  return !!(set && set.size > 0);
}

// ---- Socket auth middleware (expects auth: { token }) ----
io.use((socket, next) => {
  const { token } = socket.handshake.auth || {};
  if (!token) return next(new Error("unauthorized"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.userId || payload.id || payload.sub; // adjust to your token shape
    if (!userId) return next(new Error("unauthorized"));
    socket.data.userId = String(userId);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

// Guard: ensure the user is a member/admin of the room they want to join
async function ensureMembership(chatGroupId, userId) {
  try {
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
  } catch {
    return false;
  }
}

// ---- Socket events ----
io.on("connection", (socket) => {
  const userId = socket.data.userId;
  if (!userId) return socket.disconnect(true);

  // Presence + per-user notifications room
  addPresence(userId, socket.id);
  socket.join(`user:${userId}`);

  // ---- Room join/leave (with ACK + membership guard) ----
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

  // ---- Back-compat basic join/leave (string roomId) ----
  socket.on("join", async (roomId) => {
    if (!roomId) return;
    if (await ensureMembership(String(roomId), userId)) socket.join(String(roomId));
  });
  socket.on("leave", (roomId) => {
    if (roomId) socket.leave(String(roomId));
  });

  // ---- WebRTC signaling (room-scoped) ----
  io.on("connection", (socket) => {
  socket.on("room:join", ({ roomId }) => socket.join(roomId));
  socket.on("room:leave", ({ roomId }) => socket.leave(roomId));

  socket.on("call:ring", ({ roomId, fromUser, mode }) => {
    // notify others in the room
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
});

  // ---- Typing UX (ACCEPT chatGroupId or roomId; FORWARD username) ----
  socket.on("typing:start", ({ roomId, chatGroupId, userId: uid, username }) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return;
    // No DB read for typing; rely on room join guard above
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

  // ---- Presence updates (emit aggregate for your UI) ----
  socket.on("disconnect", (reason) => {
    removePresence(userId, socket.id);
  });
});


// ----- Start server -----
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
