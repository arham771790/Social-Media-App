"use client";
import { io } from "socket.io-client";

/**
 * Always point NEXT_PUBLIC_SOCKET_URL to the server ROOT (no /api).
 * Examples:
 *   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
 *   NEXT_PUBLIC_API_URL=http://localhost:4000  // fallback if SOCKET_URL not set
 */
const SOCKET_URL =
  (process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000").replace(/\/+$/, "");

let sock = null;

export function connectSocket(token) {
  // Reuse existing connection if alive
  if (sock && sock.connected) return sock;

  // Create (or reuse) instance
  if (!sock) {
    sock = io(SOCKET_URL, {
      path: "/socket.io",           // default path (matches your server)
      transports: ["websocket"],    // force ws for speed
      withCredentials: true,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 20000,               // handshake timeout
    });

    // Optional debug hooks
    sock.on("connect", () => console.debug("[socket] connected", sock.id));
    sock.on("connect_error", (e) =>
      console.warn("[socket] connect_error", e?.message || e)
    );
    sock.on("disconnect", (reason) =>
      console.debug("[socket] disconnected", reason)
    );
  } else {
    // If instance exists but token changed, update auth + reconnect if needed
    sock.auth = token ? { token } : undefined;
    if (!sock.connected) sock.connect();
  }

  return sock;
}

export function getSocket() {
  return sock;
}

/** Helpers for room ops (use these in your store/UI) */
export function joinRoom(chatGroupId) {
  if (!sock) throw new Error("Socket not connected");
  return new Promise((resolve) => {
    sock.emit("room:join", { chatGroupId: String(chatGroupId) }, (ack) =>
      resolve(ack || { ok: false, error: "no_ack" })
    );
  });
}

export function leaveRoom(chatGroupId) {
  if (!sock) throw new Error("Socket not connected");
  return new Promise((resolve) => {
    sock.emit("room:leave", { chatGroupId: String(chatGroupId) }, (ack) =>
      resolve(ack || { ok: false, error: "no_ack" })
    );
  });
}

/** Typing (optional wire-up) */
export function typingStart(chatGroupId, userId, username) {
  sock?.emit("typing:start", {
    chatGroupId: String(chatGroupId),
    userId: String(userId),
    username,
  });
}
export function typingStop(chatGroupId, userId) {
  sock?.emit("typing:stop", {
    chatGroupId: String(chatGroupId),
    userId: String(userId),
  });
}
export function emitTyping(action, payload) {
  if (!sock) throw new Error("Socket not connected");

  if (action === "start") {
    sock.emit("typing:start", {
      chatGroupId: String(payload.chatGroupId),
      userId: String(payload.userId),
      username: payload.username,
    });
  } else if (action === "stop") {
    sock.emit("typing:stop", {
      chatGroupId: String(payload.chatGroupId),
      userId: String(payload.userId),
    });
  }
}
