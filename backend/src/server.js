// server.js
import app from "./app.js";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./utils/db.js"; // for membership checks

const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);

// Allow multiple origins via env (comma separated) — trim to avoid CORS mismatches
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  // Heartbeat tuning (optional but helpful for stale connections)
  pingInterval: 25000,
  pingTimeout: 20000,
});

// -------- Presence tracking --------
// Support multiple tabs/devices per user.
// Internally: userId -> Set<socketId>
// Kept for back-compat: userSocketMap (last socketId)
const userSockets = new Map();
export const userSocketMap = new Map(); // userId -> last socketId (legacy export)

// Utility: add/remove presence
function addPresence(userId, socketId) {
  const set = userSockets.get(userId) || new Set();
  set.add(socketId);
  userSockets.set(userId, set);
  userSocketMap.set(userId, socketId); // keep last one
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
    // refresh last socket reference
    const [any] = set;
    userSocketMap.set(userId, any);
  }
}

// Export a helper controllers can reuse
export function isUserOnline(userId) {
  const set = userSockets.get(String(userId));
  return !!(set && set.size > 0);
}

// ---- Socket auth middleware (same JWT as your HTTP auth) ----
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

  // Presence + per-user room (used for notifications)
  addPresence(userId, socket.id);
  socket.join(`user:${userId}`);

  // JOIN chat rooms — supports both new and legacy event names
  // New unified API with ACK: { ok: boolean, error?: string }
  socket.on("room:join", async ({ chatGroupId, roomId }, ack) => {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return ack?.({ ok: false, error: "invalid_room" });

    // Guard membership to avoid unauthorized snooping
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

  // Back-compat with older client (string roomId) — also guarded now
  socket.on("join", async (roomId) => {
    if (!roomId) return;
    if (await ensureMembership(String(roomId), userId)) socket.join(String(roomId));
  });
  socket.on("leave", (roomId) => {
    if (roomId) socket.leave(String(roomId));
  });

  // WebRTC signaling (room-scoped)
  socket.on("call:offer",    ({ roomId, sdp, fromUser }) => { if (roomId) socket.to(String(roomId)).emit("call:offer",    { sdp, fromUser }); });
  socket.on("call:answer",   ({ roomId, sdp, fromUser }) => { if (roomId) socket.to(String(roomId)).emit("call:answer",   { sdp, fromUser }); });
  socket.on("call:candidate",({ roomId, candidate, fromUser }) => { if (roomId) socket.to(String(roomId)).emit("call:candidate", { candidate, fromUser }); });
  socket.on("call:end",      ({ roomId, reason }) => { if (roomId) io.to(String(roomId)).emit("call:end", { reason }); });

  // Typing UX (room-scoped)
  socket.on("typing:start", ({ roomId, userId: uid }) => {
    if (roomId) socket.to(String(roomId)).emit("typing:start", { userId: uid || userId });
  });
  socket.on("typing:stop",  ({ roomId, userId: uid }) => {
    if (roomId) socket.to(String(roomId)).emit("typing:stop",  { userId: uid || userId });
  });

  socket.on("disconnect", () => {
    removePresence(userId, socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
