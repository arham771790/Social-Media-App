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
      void this._emitPresenceEvent("presence:online", userId);
    }
  }

  _removePresence(userId, socketId) {
    const set = this.userSockets.get(userId);
    if (!set) return;
    
    set.delete(socketId);
    if (set.size === 0) {
      this.userSockets.delete(userId);
      this.userSocketMap.delete(userId);
      void this._emitPresenceEvent("presence:offline", userId);
    } else {
      const any = set.values().next().value;
      this.userSocketMap.set(userId, any);
    }
  }

  async _emitPresenceEvent(event, userId) {
    const audienceUserIds = await this._getPresenceAudienceUserIds(userId);
    audienceUserIds.forEach((audienceUserId) => {
      this.io.to(`user:${audienceUserId}`).emit(event, { userId });
    });
  }

  _emitToUserRooms(userIds, event, payload) {
    userIds.forEach((targetUserId) => {
      this.io.to(`user:${targetUserId}`).emit(event, payload);
    });
  }

  async _emitCallEventToPeers(roomId, senderUserId, event, payload) {
    const participantIds = await this._getChatGroupParticipantIds(roomId);
    const peerIds = participantIds.filter((participantId) => participantId !== String(senderUserId));
    this._emitToUserRooms(peerIds, event, payload);
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
    const userId = socket.data.userId;

    socket.on("call:ring", async (data) => {
      const { roomId } = data;
      if (!roomId) return;
      
      // Security: verify caller is in the room
      const isMember = await this._checkMembership(roomId, userId);
      if (!isMember) return;

      await this._emitCallEventToPeers(roomId, userId, "call:ring", data);
    });

    const events = ["call:ready", "call:offer", "call:answer", "call:candidate"];
    events.forEach(event => {
      socket.on(event, async (data) => {
        const { roomId } = data;
        if (!roomId) return;

        // Verify membership
        const isMember = await this._checkMembership(roomId, userId);
        if (!isMember) return;

        // Forward to others in the room
        socket.to(String(roomId)).emit(event, data);
      });
    });
    
    socket.on("call:end", async ({ roomId, reason }) => {
      if (!roomId) return;
      const isMember = await this._checkMembership(roomId, userId);
      if (!isMember) return;

      await this._emitCallEventToPeers(roomId, userId, "call:end", { roomId, reason });
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
            { createdById: userId },
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

  async _getChatGroupParticipantIds(chatGroupId) {
    try {
      const group = await prisma.chatGroup.findUnique({
        where: { id: chatGroupId },
        select: {
          createdById: true,
          admins: { select: { id: true } },
          members: { select: { id: true } },
        },
      });

      if (!group) return [];

      return Array.from(new Set([
        String(group.createdById),
        ...group.admins.map(({ id }) => String(id)),
        ...group.members.map(({ id }) => String(id)),
      ]));
    } catch {
      return [];
    }
  }

  async _getPresenceAudienceUserIds(userId) {
    try {
      const groups = await prisma.chatGroup.findMany({
        where: {
          OR: [
            { members: { some: { id: userId } } },
            { admins: { some: { id: userId } } },
            { createdById: userId },
          ],
        },
        select: {
          createdById: true,
          admins: { select: { id: true } },
          members: { select: { id: true } },
        },
      });

      const audience = new Set();
      groups.forEach((group) => {
        audience.add(String(group.createdById));
        group.admins.forEach(({ id }) => audience.add(String(id)));
        group.members.forEach(({ id }) => audience.add(String(id)));
      });
      audience.delete(String(userId));

      return [...audience];
    } catch (error) {
      logger.warn(`Failed to compute presence audience for ${userId}: ${error.message}`);
      return [];
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
