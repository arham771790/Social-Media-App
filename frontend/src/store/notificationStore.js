"use client";
import { create } from "zustand";
import api from "@/lib/axios";
import { socket } from "@/lib/socket";

export const useNotificationStore = create((set, get) => ({
  items: [],                 // array of notifications (sorted desc by createdAt)
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 0, pages: 0 },
  _socketBound: false,

  // Initial / paginated fetch
  fetchNotifications: async ({ page = 1, limit = 20 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/notifications", { params: { page, limit } });
      const list = Array.isArray(data) ? data : (data.notifications || []);
      const pag  = data.pagination || { page, limit, total: list.length, pages: 1 };

      // server may return unread count separately; if not, derive
      const unread = (Array.isArray(data.unread) ? data.unread.length :
                      typeof data.unreadCount === "number" ? data.unreadCount :
                      list.filter(n => !n.read).length);

      // On page>1 append; on page=1 replace
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
      await api.post(`/api/notifications/${id}/read`);
    } catch {} // don't block UI if API shape differs
    set((s) => {
      const items = s.items.map(n => n.id === id ? { ...n, read: true } : n);
      const unreadCount = Math.max(0, s.unreadCount - (s.items.find(n => n.id === id && !n.read) ? 1 : 0));
      return { items, unreadCount };
    });
  },

  // Mark all as read
  markAllRead: async () => {
    try {
      // Accept either of these:
      await api.post("/api/notifications/mark-all-read")
        .catch(() => api.post("/api/notifications/read-all"));
    } catch {}
    set((s) => ({
      items: s.items.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  // Bind socket listener once
  bindSocket: () => {
    if (get()._socketBound) return;
    socket.on("notification:new", (notif) => {
      // notif expected to look like: { id, type, message, createdAt, read:false, relatedUserId?, relatedPostId? }
      set((s) => ({
        items: [notif, ...s.items],
        unreadCount: s.unreadCount + 1,
      }));
    });
    set({ _socketBound: true });
  },
}));
