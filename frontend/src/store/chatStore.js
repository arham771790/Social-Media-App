// src/store/chatStore.js
// Keeps threads/messages in sync with server via REST + Socket.IO.
// Includes optimistic send, reconcile by clientTempId, unread badges, and read receipts.

"use client";

import { create } from "zustand";
import api from "@/lib/axios";
import { io as ioClient } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const newTempId = () => `temp:${Date.now()}:${Math.random().toString(36).slice(2)}`;

export const useChatStore = create((set, get) => ({
  threads: [],                 // sidebar threads
  totalUnread: 0,              // header badge
  messagesByGroup: {},         // { [chatGroupId]: { items, index:Set, isLoading, hasFetched, pageInfo, hasMore } }
  pendingByGroup: {},          // { [chatGroupId]: { [clientTempId]: tempId } }
  joinedRooms: new Set(),      // which rooms we've joined
  socket: null,
  isLoading: false,
  error: null,

  /* --------- THREADS / COUNTS --------- */
  fetchThreads: async () => {
  set({ loading: true, error: null });
  try {
    const res = await api.get("/api/messages/threads");

    // backend usually returns { threads, totalUnread }
    const raw = res?.data ?? {};
    const threadsArr = Array.isArray(raw?.threads)
      ? raw.threads
      : Array.isArray(raw) // tolerate legacy array-only responses
      ? raw
      : [];

    // Sort newest-first:
    // prefer lastMessage.timestamp, then lastActivityAt, then createdAt
    const sortedThreads = threadsArr.slice().sort((a, b) => {
      const ta =
        (a.lastMessage?.timestamp && new Date(a.lastMessage.timestamp).getTime()) ||
        (a.lastActivityAt && new Date(a.lastActivityAt).getTime()) ||
        (a.createdAt && new Date(a.createdAt).getTime()) ||
        0;
      const tb =
        (b.lastMessage?.timestamp && new Date(b.lastMessage.timestamp).getTime()) ||
        (b.lastActivityAt && new Date(b.lastActivityAt).getTime()) ||
        (b.createdAt && new Date(b.createdAt).getTime()) ||
        0;
      return tb - ta;
    });

    set({
      threads: sortedThreads,                 // ✅ correct key
      totalUnread: raw?.totalUnread ?? 0,     // ✅ header badge
      loading: false,
    });

    return sortedThreads;
  } catch (err) {
    const status = err?.response?.status;
    const body = err?.response?.data;
    const msg =
      body?.error || body?.message || err?.message || "Failed to get chat threads";
    console.error("fetchThreads error:", status, body || msg);
    set({ error: msg, loading: false });
    throw new Error(msg);
  }
},


  fetchUnreadTotal: async () => {
    try {
      const { data } = await api.get("/api/messages/unread-count");
      const total = typeof data?.total === "number" ? data.total : 0;
      set({ totalUnread: total });
      return total;
    } catch {
      return 0;
    }
  },

  /* ------------- MESSAGES -------------- */
  fetchMessages: async (chatGroupId) => {
    if (!chatGroupId) return [];
    get().joinRoom(chatGroupId); // ensure room subscription

    set(s => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [chatGroupId]: { ...(s.messagesByGroup[chatGroupId] || {}), isLoading: true },
      },
      error: null,
    }));

    try {
      // server will also mark as read + emit 'messages:read'
      const { data } = await api.get(`/api/messages/${chatGroupId}`);
      const items = Array.isArray(data?.items) ? data.items : [];
      const index = new Set(items.map(m => m.id));
      const pageInfo = data?.pageInfo || {};
      const hasMore = !!pageInfo?.hasMore;

      set(s => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: { items, index, pageInfo, hasMore, isLoading: false, hasFetched: true },
        },
        // zero out local badge for this thread
        threads: s.threads.map(t => (t.id === chatGroupId ? { ...t, unread: 0 } : t)),
      }));

      // refresh global unread badge
      get().fetchUnreadTotal().catch(() => {});
      return items;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load messages";
      set(s => ({
        error: msg,
        messagesByGroup: {
          ...(s.messagesByGroup),
          [chatGroupId]: { ...(s.messagesByGroup[chatGroupId] || {}), isLoading: false },
        },
      }));
      throw new Error(msg);
    }
  },

  markRead: async (chatGroupId) => {
    try {
      await api.put(`/api/messages/${chatGroupId}/read`);
      set(s => ({
        threads: s.threads.map(t => (t.id === chatGroupId ? { ...t, unread: 0 } : t)),
      }));
      get().fetchUnreadTotal().catch(() => {});
    } catch {}
  },

  /* ------- SEND (optimistic + reconcile) ------- */
  sendMessage: async (chatGroupId, { content, mediaUrl } = {}) => {
    if (!chatGroupId || (!content && !mediaUrl)) return null;

    const me = useAuthStore.getState()?.user;
    const clientTempId = newTempId();
    const tempId = newTempId();

    const optimistic = {
      id: tempId,
      chatGroupId,
      content: content || null,
      mediaUrl: mediaUrl || null,
      type: mediaUrl ? inferType(mediaUrl) : "TEXT",
      sender: me ? { id: me.id, username: me.username, avatar: me.avatar } : null,
      readBy: me ? [{ id: me.id }] : [],
      createdAt: new Date().toISOString(),
      optimistic: true,
      clientTempId,
    };

    // stage the bubble
    set(s => {
      const bucket = s.messagesByGroup[chatGroupId] || { items: [], index: new Set() };
      const items = [...bucket.items, optimistic];
      const index = new Set(bucket.index); index.add(tempId);
      const pending = { ...(s.pendingByGroup[chatGroupId] || {}), [clientTempId]: tempId };
      return {
        messagesByGroup: { ...s.messagesByGroup, [chatGroupId]: { ...bucket, items, index } },
        pendingByGroup:  { ...s.pendingByGroup, [chatGroupId]: pending },
      };
    });

    // bump thread preview
    set(s => ({
      threads: bumpThreadToTop(s.threads, chatGroupId, {
        content: content || (mediaUrl ? "Attachment" : ""),
        timestamp: new Date().toISOString(),
        sender: me ? { username: me.username } : null,
      }),
    }));

    try {
      const { data } = await api.post(`/api/messages/${chatGroupId}`, { content, mediaUrl, clientTempId });
      // reconcile even if socket echo is late/missed
      get()._reconcile(chatGroupId, data, clientTempId);
      return data;
    } catch (err) {
      // rollback on error
      set(s => {
        const bucket = s.messagesByGroup[chatGroupId] || { items: [], index: new Set() };
        const temp = (s.pendingByGroup[chatGroupId] || {})[clientTempId];
        const items = bucket.items.filter(m => m.id !== temp);
        const index = new Set(bucket.index); index.delete(temp);
        const pending = { ...(s.pendingByGroup[chatGroupId] || {}) }; delete pending[clientTempId];
        return {
          messagesByGroup: { ...s.messagesByGroup, [chatGroupId]: { ...bucket, items, index } },
          pendingByGroup:  { ...s.pendingByGroup, [chatGroupId]: pending },
          error: err?.response?.data?.error || "Failed to send message",
        };
      });
      throw err;
    }
  },

  _reconcile: (chatGroupId, realMessage, clientTempId) => {
    set(s => {
      const bucket = s.messagesByGroup[chatGroupId] || { items: [], index: new Set() };
      const pending = { ...(s.pendingByGroup[chatGroupId] || {}) };
      const tempId = clientTempId ? pending[clientTempId] : null;

      let items = bucket.items;
      let index = new Set(bucket.index);

      if (tempId) {
        items = items.map(m => (m.id === tempId ? realMessage : m));
        index.delete(tempId); index.add(realMessage.id);
        delete pending[clientTempId];
      } else if (!index.has(realMessage.id)) {
        items = [...items, realMessage];
        index.add(realMessage.id);
      }

      const threads = bumpThreadToTop(s.threads, chatGroupId, realMessage);

      return {
        messagesByGroup: { ...s.messagesByGroup, [chatGroupId]: { ...bucket, items, index } },
        pendingByGroup:  { ...s.pendingByGroup, [chatGroupId]: pending },
        threads,
      };
    });
  },

  /* --------------- SOCKET.IO --------------- */
  bindSocket: (ioLib = ioClient, token) => {
    // disconnect previous
    const prev = get().socket;
    if (prev?.connected) prev.disconnect();

    const socket = ioLib(API_URL, {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
      withCredentials: true,
    });

    socket.on("connect", () => {
      // join all rooms we know about
      get().threads.forEach(t => socket.emit("room:join", { chatGroupId: t.id }));
    });

    // New message from server (with optional clientTempId for reconcile)
    socket.on("message:new", ({ chatGroupId, message, clientTempId }) => {
      get()._reconcile(chatGroupId, message, clientTempId);

      // If we haven't fetched this chat yet, bump unread locally
      const bucket = get().messagesByGroup[chatGroupId];
      if (!bucket?.hasFetched) {
        set(s => ({
          threads: s.threads.map(t => t.id === chatGroupId ? { ...t, unread: (t.unread || 0) + 1 } : t),
          totalUnread: s.totalUnread + 1,
        }));
      }
    });

    // Read receipts
    socket.on("messages:read", ({ chatGroupId, userId, messageIds }) => {
      set(s => {
        const bucket = s.messagesByGroup[chatGroupId];
        if (!bucket?.items?.length) return {};
        const items = bucket.items.map(m =>
          messageIds.includes(m.id)
            ? { ...m, readBy: uniqById([...(m.readBy || []), { id: userId }]) }
            : m
        );
        return { messagesByGroup: { ...s.messagesByGroup, [chatGroupId]: { ...bucket, items } } };
      });
      get().fetchUnreadTotal().catch(() => {});
    });

    // Notifications (optional UI hooks)
    socket.on("notification:new", (notif) => {
      // show toast or add to a notifications store
      // console.log("notification:new", notif);
    });
    socket.on("notifications:unread", ({ unread }) => {
      // update a global notifications badge if you have one
      // console.log("notifications:unread", unread);
    });

    socket.on("presence:online", ({ userId }) => {});
    socket.on("presence:offline", ({ userId }) => {});
    socket.on("typing:start", ({ userId, roomId }) => {});
    socket.on("typing:stop",  ({ userId, roomId }) => {});
    socket.on("connect_error", (err) => console.error("socket error", err?.message || err));

    set({ socket });
  },

  joinRoom: (chatGroupId) => {
    const { socket, joinedRooms } = get();
    if (!socket || !chatGroupId || joinedRooms.has(chatGroupId)) return;
    socket.emit("room:join", { chatGroupId });
    const next = new Set(joinedRooms); next.add(chatGroupId);
    set({ joinedRooms: next });
  },
}));

/* helpers */
function inferType(url) {
  const s = String(url || "").toLowerCase();
  if (/\.(mp4|mov|mkv|webm)$/.test(s)) return "VIDEO";
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(s)) return "IMAGE";
  return url ? "FILE" : "TEXT";
}
function uniqById(arr) {
  const seen = new Set();
  return arr.filter(x => (x && !seen.has(x.id) && seen.add(x.id)));
}
function bumpThreadToTop(threads, chatGroupId, lastMessageLike) {
  const list = [...threads];
  const i = list.findIndex(t => t.id === chatGroupId);
  if (i === -1) return list;
  const src = list[i];
  const last = lastMessageLike
    ? {
        id: lastMessageLike.id,
        content: lastMessageLike.content || (lastMessageLike.type && lastMessageLike.type !== "TEXT" ? lastMessageLike.type : ""),
        type: lastMessageLike.type || (lastMessageLike.mediaUrl ? inferType(lastMessageLike.mediaUrl) : "TEXT"),
        sender: lastMessageLike.sender || src.lastMessage?.sender || null,
        timestamp: lastMessageLike.timestamp || lastMessageLike.createdAt || new Date().toISOString(),
      }
    : src.lastMessage;

  const t = { ...src, lastMessage: last };
  list.splice(i, 1);
  return [t, ...list];
}
