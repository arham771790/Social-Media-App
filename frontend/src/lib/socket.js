// src/lib/socket.js
import { io } from "socket.io-client";

export const socket = io(process.env.NEXT_PUBLIC_API_URL, {
  transports: ["websocket"],
  withCredentials: true,
  // If your server reads userId from handshake.auth:
  auth: () => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      return { userId: parsed?.id };
    } catch {
      return {};
    }
  },
});
