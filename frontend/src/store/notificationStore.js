// src/store/notificationStore.js
"use client";

import { create } from "zustand";
import api from "@/lib/axios";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

export const useNotificationStore = create((set, get) => ({
  items: [],                 // notifications (newest first)
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  _socketBound: false,

  // Initial / paginated fetch
  fetchNotifications: async ({ page = 1, limit = 20 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/notifications", { params: { page, limit } });
      const list = Array.isArray(data) ? data : (data.notifications || []);
      const pag  = data.pagination || { page, limit, total: list.length, pages: 1 };

      // server may return unread count separately; if not, derive
      const unread = (Array.isArray(data.unread) ? data.unread.length
                    : typeof data.unreadCount === "number" ? data.unreadCount
                    : list.filter(n => !n.read).length);

      set((s) => ({
        items: page === 1 ? list : [...s.items, ...list],
        pagination: { page: pag.page, limit: pag.limit, total: pag.total, pages: pag.pages },
        unreadCount: unread,
        isLoading: false,
      }));
    } catch (e) {
      set({ error: e?.response?.data?.error || "Failed to load notifications", isLoading: false });
    }
  },

  // Mark one as read
  markRead: async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {}
    set((s) => {
      const wasUnread = s.items.find(n => n.id === id && !n.read);
      const items = s.items.map(n => (n.id === id ? { ...n, read: true } : n));
      const unreadCount = Math.max(0, s.unreadCount - (wasUnread ? 1 : 0));
      return { items, unreadCount };
    });
  },

  // Mark all as read
  markAllRead: async () => {
    try {
      await api.post("/notifications/mark-all-read")
        .catch(() => api.post("/notifications/read-all")); // fallback
    } catch {}
    set((s) => ({
      items: s.items.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Bind socket listeners (idempotent). Pass token or it will pull from auth store/localStorage.
  bindSocket: (token) => {
    if (get()._socketBound) return;

    const jwt = token || useAuthStore.getState()?.token;
    const socket = connectSocket(jwt);
    if (!socket) return;

    // Avoid duplicate handlers
    socket.off("notification:new");
    socket.off("notifications:unread");

    socket.on("notification:new", (notif) => {
      // Expected: { id, type, message, createdAt, read:false, relatedUserId?, relatedPostId? }
      set((s) => ({
        items: [notif, ...s.items],
        unreadCount: s.unreadCount + (notif?.read ? 0 : 1),
      }));
    });

    socket.on("notifications:unread", ({ unread }) => {
      if (typeof unread === "number") set({ unreadCount: unread });
    });

    set({ _socketBound: true });
  },

  // Optional helpers
  refreshSocket: (nextToken) => {
    const socket = connectSocket(nextToken);
    if (!socket) return;
    // Rebind to ensure handlers exist after reconnect (off/ons are idempotent)
    get()._socketBound = false;
    get().bindSocket(nextToken);
  },

  reset: () => {
    set({
      items: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      _socketBound: false,
    });
  },
}));
