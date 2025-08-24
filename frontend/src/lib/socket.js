"use client";
import { io } from "socket.io-client";

let sock = null;

// Always point NEXT_PUBLIC_SOCKET_URL to the server root (no /api)
// Example: http://localhost:4000 or https://yourdomain.com
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export function connectSocket(token) {
  if (sock?.connected) return sock;

  sock = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: token ? { token } : undefined,
    withCredentials: true,
  });

  return sock;
}

export function getSocket() {
  return sock;
}
