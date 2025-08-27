// src/store/messageStore.js
"use client";

import { create } from "zustand";
import api from "@/lib/axios";
import {
  connectSocket,
  joinRoom as sockJoin,
  leaveRoom as sockLeave,
  emitTyping,
  getSocket,
} from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

const ACTIVE_KEY = "activeChatId";

/* Helpers */
const getToken = () => {
  try { const t = useAuthStore.getState().token; if (t) return t; } catch {}
  if (typeof window !== "undefined") return localStorage.getItem("token");
  return null;
};
const getUser = () => {
  try { const u = useAuthStore.getState().user; if (u) return u; } catch {}
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
};

export const useMessageStore = create((set, get) => ({
  // connection state
  socketReady: false,

  // presence / typing
  onlineUserIds: new Set(),            // Set<string>
  typingByGroup: {},                   // { [groupId]: { [userId]: username } }

  // threads & counts
  threads: [],
  totalUnread: 0,
  loadingThreads: false,

  // active chat
  activeChatId: null,
  loadingMessagesByGroup: {},          // { [groupId]: boolean }

  // messages per room (ASC)
  messagesByGroup: {},                 // { [groupId]: Message[] }
  pageInfoByGroup: {},                 // { [groupId]: { hasMore, before } }

  // ----- SOCKET BIND -----
  bindSocket: (token) => {
    const s = connectSocket(token || getToken());
    if (!s) return;

    s.off("connect");
    s.on("connect", async () => {
      const active = get().activeChatId;
      if (active) await sockJoin(active);
      set({ socketReady: true });
    });

    // presence
    s.off("presence:online");
    s.off("presence:offline");
    s.on("presence:online", ({ userId }) => {
      set((st) => {
        const setIds = new Set(st.onlineUserIds);
        setIds.add(String(userId));
        return { onlineUserIds: setIds };
      });
    });
    s.on("presence:offline", ({ userId }) => {
      set((st) => {
        const setIds = new Set(st.onlineUserIds);
        setIds.delete(String(userId));
        return { onlineUserIds: setIds };
      });
    });

    // typing
    s.off("typing:start");
    s.off("typing:stop");
    s.on("typing:start", ({ chatGroupId, userId, username }) => {
      set((st) => {
        const by = { ...(st.typingByGroup || {}) };
        const room = { ...(by[chatGroupId] || {}) };
        room[String(userId)] = username || String(userId);
        by[chatGroupId] = room;
        return { typingByGroup: by };
      });
    });
    s.on("typing:stop", ({ chatGroupId, userId }) => {
      set((st) => {
        const by = { ...(st.typingByGroup || {}) };
        const room = { ...(by[chatGroupId] || {}) };
        delete room[String(userId)];
        by[chatGroupId] = room;
        return { typingByGroup: by };
      });
    });

    // new message
    s.off("message:new");
    s.on("message:new", ({ chatGroupId, message, clientTempId }) => {
      const byRoom = { ...(get().messagesByGroup || {}) };
      const list = [...(byRoom[chatGroupId] || [])];

      if (clientTempId) {
        const idx = list.findIndex((m) => m.__clientTempId === clientTempId);
        if (idx !== -1) list[idx] = { ...message };
        else list.push(message);
      } else {
        list.push(message);
      }
      byRoom[chatGroupId] = list;
      set({ messagesByGroup: byRoom });

      // bump thread preview + unread if not active
      const { threads, activeChatId } = get();
      const i = threads.findIndex((t) => t.id === chatGroupId);
      if (i !== -1) {
        const t = { ...threads[i] };
        t.lastMessage = {
          id: message.id,
          content: message.content,
          type: message.type,
          sender: message.sender,
          timestamp: message.createdAt,
        };
        if (activeChatId !== chatGroupId) t.unread = (t.unread || 0) + 1;

        const next = [...threads];
        next.splice(i, 1);
        next.unshift(t);
        set({ threads: next });
      }
    });

    // read receipts
    s.off("messages:read");
    s.on("messages:read", ({ chatGroupId, userId, messageIds }) => {
      const byRoom = { ...(get().messagesByGroup || {}) };
      const list = [...(byRoom[chatGroupId] || [])];
      if (!list.length) return;
      const updated = list.map((m) =>
        messageIds.includes(m.id)
          ? { ...m, readBy: [...(m.readBy || []), { id: userId }] }
          : m
      );
      byRoom[chatGroupId] = updated;
      set({ messagesByGroup: byRoom });
    });
  },

  // ----- PRESENCE (initial snapshot for a room) -----
  refreshPresence: async (chatGroupId) => {
    try {
      const { data } = await api.get(`/messages/${chatGroupId}/presence`);
      const online = (data?.users || []).filter((u) => u.online).map((u) => String(u.id));
      set((st) => {
        const setIds = new Set(st.onlineUserIds);
        for (const id of online) setIds.add(id);
        return { onlineUserIds: setIds };
      });
    } catch (e) {
      // silent fail is fine
    }
  },

  // ----- THREADS -----
  fetchThreads: async () => {
    set({ loadingThreads: true });
    try {
      const { data } = await api.get("/messages/threads");
      set({
        threads: data?.threads || [],
        totalUnread: data?.totalUnread || 0,
      });
      return data?.threads || [];
    } finally {
      set({ loadingThreads: false });
    }
  },

  // ----- MESSAGES -----
  fetchMessages: async (chatGroupId, limit = 50) => {
    set((st) => ({ loadingMessagesByGroup: { ...st.loadingMessagesByGroup, [chatGroupId]: true } }));
    try {
      const { data } = await api.get(`/messages/${chatGroupId}`, { params: { limit } });
      set((state) => ({
        messagesByGroup: { ...state.messagesByGroup, [chatGroupId]: data?.items || [] },
        pageInfoByGroup: { ...state.pageInfoByGroup, [chatGroupId]: data?.pageInfo || { hasMore: false, before: null } },
      }));
    } finally {
      set((st) => ({ loadingMessagesByGroup: { ...st.loadingMessagesByGroup, [chatGroupId]: false } }));
    }
  },

  loadOlder: async (chatGroupId) => {
    const info = get().pageInfoByGroup[chatGroupId];
    if (!info?.hasMore || !info?.before) return;
    const { data } = await api.get(`/messages/${chatGroupId}`, { params: { before: info.before, limit: 50 } });

    const prev = get().messagesByGroup[chatGroupId] || [];
    set((state) => ({
      messagesByGroup: { ...state.messagesByGroup, [chatGroupId]: [...(data?.items || []), ...prev] },
      pageInfoByGroup: { ...state.pageInfoByGroup, [chatGroupId]: data?.pageInfo || { hasMore: false, before: null } },
    }));
  },

  // ----- ACTIVE ROOM + READ -----
  setActiveChat: async (groupId) => {
    const prev = get().activeChatId;
    if (prev && prev !== groupId) await sockLeave(prev);

    set({ activeChatId: groupId });
    if (groupId) {
      await sockJoin(groupId);
      await get().fetchMessages(groupId);
      await get().markRead(groupId);
      await get().refreshPresence(groupId);
      try { localStorage.setItem(ACTIVE_KEY, groupId); } catch {}
    } else {
      try { localStorage.removeItem(ACTIVE_KEY); } catch {}
    }
  },

  // wrappers
  joinRoom: async (groupId) => {
    if (!groupId) return { ok: false };
    return await sockJoin(groupId);
  },
  leaveRoom: async (groupId) => {
    if (!groupId) return { ok: false };
    return await sockLeave(groupId);
  },

  markRead: async (chatGroupId) => {
    try {
      await api.put(`/messages/${chatGroupId}/read`);
      // drop unread badge locally
      set((state) => {
        const threads = [...state.threads];
        const i = threads.findIndex((t) => t.id === chatGroupId);
        if (i !== -1) threads[i] = { ...threads[i], unread: 0 };
        return { threads };
      });
    } catch (e) {
      console.warn("markRead failed", e?.message || e);
    }
  },
  markAsRead: async (chatGroupId) => get().markRead(chatGroupId),

  // ----- SEND (optimistic) -----
  sendMessage: async (chatGroupId, payload) => {
    const me = getUser();
    const clientTempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: clientTempId,
      content: payload.content || null,
      mediaUrl: payload.mediaUrl || null,
      type: payload.mediaUrl ? "FILE" : "TEXT",
      sender: { id: me?.id, username: me?.username, avatar: me?.avatar },
      chatGroupId,
      createdAt: new Date().toISOString(),
      readBy: me?.id ? [{ id: me.id }] : [],
      __clientTempId: clientTempId,
      __optimistic: true,
    };

    set((state) => {
      const list = [...(state.messagesByGroup[chatGroupId] || []), optimistic];
      return { messagesByGroup: { ...state.messagesByGroup, [chatGroupId]: list } };
    });

    try {
      await api.post(`/messages/${chatGroupId}`, { ...payload, clientTempId });
    } catch (e) {
      set((state) => {
        const list = (state.messagesByGroup[chatGroupId] || []).filter((m) => m.__clientTempId !== clientTempId);
        return { messagesByGroup: { ...state.messagesByGroup, [chatGroupId]: list } };
      });
      throw e;
    }
  },

  // ----- SEARCH & CREATE -----
  searchUsers: async (q) => {
    const params = q?.trim() ? { search: q.trim() } : {};
    const { data } = await api.get("/messages/users", { params });
    return Array.isArray(data) ? data : [];
  },
  createDirect: async (targetUserId) => {
    const { data } = await api.post("/messages/direct", { targetUserId });
    return data;
  },
  createGroup: async (body) => {
  const { name, description, memberIds, imageUrl } = body;

  const { data } = await api.post("/messages/group", {
    name,
    description: description || "",
    memberIds,
    imageUrl: imageUrl || null,
  });

  return data;
},

  // ----- TYPING -----
  startTyping: (chatGroupId) => {
    const me = getUser();
    emitTyping("start", { chatGroupId, username: me?.username, userId: me?.id });
  },
  stopTyping: (chatGroupId) => {
    const me = getUser();
    emitTyping("stop", { chatGroupId, userId: me?.id });
  },
}));
