// src/lib/socket.js
import { io as clientIO } from "socket.io-client";
import { BASE_URL } from "@/lib/axios";

let socket;

export const connectSocket = (token) => {
  if (socket && socket.connected) return socket;

  socket = clientIO(BASE_URL, {
    withCredentials: true,
    autoConnect: true,
    transports: ["websocket"],
    auth: { token },
  });

  // helpful logs (optional)
  socket.on("connect_error", (err) => console.warn("Socket connect_error:", err.message));
  socket.on("error", (e) => console.warn("Socket error:", e));

  return socket;
};

export const getSocket = () => socket;

export const joinRoom = (roomId) =>
  new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, error: "no_socket" });
    socket.emit("room:join", { chatGroupId: roomId }, (ack) => resolve(ack || { ok: true }));
  });

export const leaveRoom = (roomId) =>
  new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, error: "no_socket" });
    socket.emit("room:leave", { chatGroupId: roomId }, (ack) => resolve(ack || { ok: true }));
  });

export const emitTyping = (kind, payload) => {
  if (!socket) return;
  const evt = kind === "start" ? "typing:start" : "typing:stop";
  socket.emit(evt, { ...payload, roomId: payload.chatGroupId });
};

// ---- WebRTC signaling helpers (socket events) ----
export const ring = (roomId, { fromUser, mode = "audio" }) =>
  socket?.emit("call:ring", { roomId, fromUser, mode });

export const sendOffer = (roomId, sdp, fromUser) =>
  socket?.emit("call:offer", { roomId, sdp, fromUser });

export const sendAnswer = (roomId, sdp, fromUser) =>
  socket?.emit("call:answer", { roomId, sdp, fromUser });

export const sendCandidate = (roomId, candidate, fromUser) =>
  socket?.emit("call:candidate", { roomId, candidate, fromUser });

export const endCall = (roomId, reason = "user_end") =>
  socket?.emit("call:end", { roomId, reason });