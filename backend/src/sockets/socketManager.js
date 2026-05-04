import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../utils/db.js";
import logger from "../utils/logger.js";
import { config } from "../utils/config.js";

class SocketManager {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set<socketId>
    this.userSocketMap = new Map(); // userId -> last socketId
  }

  init(httpServer, corsOptions) {
    this.io = new Server(httpServer, {
      cors: corsOptions,
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    this.io.use(this._authMiddleware.bind(this));
    this.io.on("connection", this._onConnection.bind(this));
    
    logger.info("Socket.IO initialized and secured.");
    return this.io;
  }

  _authMiddleware(socket, next) {
    const { token } = socket.handshake.auth || {};
    if (!token) return next(new Error("unauthorized"));
    
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      const userId = payload.userId || payload.id || payload.sub;
      if (!userId) return next(new Error("unauthorized"));
      
      socket.data.userId = String(userId);
      next();
    } catch (error) {
      logger.warn(`Unauthorized socket attempt: ${error.message}`);
      next(new Error("unauthorized"));
    }
  }

  _onConnection(socket) {
    const userId = socket.data.userId;
    this._addPresence(userId, socket.id);
    
    socket.join(`user:${userId}`);
    logger.debug(`User connected: ${userId} (Socket: ${socket.id})`);

    // Standard Room Events
    socket.on("room:join", (data, ack) => this._handleRoomJoin(socket, data, ack));
    socket.on("room:leave", (data, ack) => this._handleRoomLeave(socket, data, ack));

    // WebRTC Signaling
    this._attachSignaling(socket);

    // Typing Indicators
    this._attachTyping(socket);

    socket.on("disconnect", () => {
      this._removePresence(userId, socket.id);
      logger.debug(`User disconnected: ${userId}`);
    });
  }

  _addPresence(userId, socketId) {
    const set = this.userSockets.get(userId) || new Set();
    set.add(socketId);
    this.userSockets.set(userId, set);
    this.userSocketMap.set(userId, socketId);
    
    if (set.size === 1) {
      this.io.emit("presence:online", { userId });
    }
  }

  _removePresence(userId, socketId) {
    const set = this.userSockets.get(userId);
    if (!set) return;
    
    set.delete(socketId);
    if (set.size === 0) {
      this.userSockets.delete(userId);
      this.userSocketMap.delete(userId);
      this.io.emit("presence:offline", { userId });
    } else {
      const any = set.values().next().value;
      this.userSocketMap.set(userId, any);
    }
  }

  async _handleRoomJoin(socket, { chatGroupId, roomId }, ack) {
    const userId = socket.data.userId;
    const rid = String(chatGroupId ?? roomId ?? "");
    
    if (!rid) return ack?.({ ok: false, error: "invalid_room" });
    
    const isMember = await this._checkMembership(rid, userId);
    if (!isMember) return ack?.({ ok: false, error: "forbidden" });
    
    socket.join(rid);
    return ack?.({ ok: true });
  }

  _handleRoomLeave(socket, { chatGroupId, roomId }, ack) {
    const rid = String(chatGroupId ?? roomId ?? "");
    if (!rid) return ack?.({ ok: false, error: "invalid_room" });
    
    socket.leave(rid);
    return ack?.({ ok: true });
  }

  _attachSignaling(socket) {
    const events = ["call:ring", "call:offer", "call:answer", "call:candidate"];
    events.forEach(event => {
      socket.on(event, (data) => {
        if (data.roomId) {
          socket.to(String(data.roomId)).emit(event, data);
        }
      });
    });
    
    socket.on("call:end", ({ roomId, reason }) => {
      if (roomId) this.io.to(String(roomId)).emit("call:end", { reason });
    });
  }

  _attachTyping(socket) {
    const userId = socket.data.userId;
    
    socket.on("typing:start", ({ chatGroupId, roomId, username }) => {
      const rid = String(chatGroupId ?? roomId ?? "");
      if (!rid) return;
      socket.to(rid).emit("typing:start", { chatGroupId: rid, userId, username });
    });

    socket.on("typing:stop", ({ chatGroupId, roomId }) => {
      const rid = String(chatGroupId ?? roomId ?? "");
      if (!rid) return;
      socket.to(rid).emit("typing:stop", { chatGroupId: rid, userId });
    });
  }

  async _checkMembership(chatGroupId, userId) {
    try {
      const count = await prisma.chatGroup.count({
        where: {
          id: chatGroupId,
          OR: [
            { members: { some: { id: userId } } },
            { admins: { some: { id: userId } } }
          ]
        }
      });
      return count > 0;
    } catch {
      return false;
    }
  }

  isUserOnline(userId) {
    const set = this.userSockets.get(String(userId));
    return !!(set && set.size > 0);
  }

  toUser(userId) {
    return this.io.to(`user:${userId}`);
  }
}

export default new SocketManager();
