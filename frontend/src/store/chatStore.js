// src/store/chatStore.js
"use client";

import { create } from "zustand";
import api from "@/lib/axios";
import { connectSocket, getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

/* --- helpers --- */
const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX ?? "") || ""; // "" if your axios base already has 
const ep = (p) => `${API_PREFIX}${p}`; // ep('/messages/threads') -> "/messages/threads" or "/messages/threads"

const newTempId = () =>
  `temp:${Date.now()}:${Math.random().toString(36).slice(2)}`;
const inferType = (url) => {
  const s = String(url || "").toLowerCase();
  if (/\.(mp4|mov|mkv|webm)$/.test(s)) return "VIDEO";
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(s)) return "IMAGE";
  return url ? "FILE" : "TEXT";
};
const uniqById = (arr) => {
  const seen = new Set();
  return arr.filter((x) => x && !seen.has(x.id) && seen.add(x.id));
};
function bumpThreadToTop(threads, chatGroupId, lastMessageLike) {
  const list = [...threads];
  const i = list.findIndex((t) => t.id === chatGroupId);
  if (i === -1) return list;
  const src = list[i];
  const last = lastMessageLike
    ? {
        id: lastMessageLike.id,
        content:
          lastMessageLike.content ||
          (lastMessageLike.type && lastMessageLike.type !== "TEXT"
            ? lastMessageLike.type
            : ""),
        type:
          lastMessageLike.type ||
          (lastMessageLike.mediaUrl ? inferType(lastMessageLike.mediaUrl) : "TEXT"),
        sender: lastMessageLike.sender || src.lastMessage?.sender || null,
        timestamp:
          lastMessageLike.timestamp ||
          lastMessageLike.createdAt ||
          new Date().toISOString(),
      }
    : src.lastMessage;
  const t = { ...src, lastMessage: last };
  list.splice(i, 1);
  return [t, ...list];
}
const TYPING_IDLE_MS = 1500;

/* --- store --- */
export const useChatStore = create((set, get) => ({
  threads: [],
  totalUnread: 0,
  messagesByGroup: {}, // { [chatGroupId]: { items, index:Set, isLoading, hasFetched, pageInfo, hasMore, typing: string[] } }
  pendingByGroup: {},
  joinedRooms: new Set(),
  onlineUserIds: new Set(), // <- presence
  // incoming call lightweight state
  incomingCall: null, // { roomId, fromUser }
  _socketBound: false,
  _typingTimers: {},
  isLoading: false,
  error: null,
  typingUsers: {},             // { [chatGroupId]: { [userId]: { username, timestamp } } }
  onlineUsers: new Set(),      // Set of online user IDs

  /* Threads */
  fetchThreads: async () => {
<<<<<<< HEAD
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(ep("/messages/threads"));
      const arr = Array.isArray(data?.threads) ? data.threads : [];
      const sorted = arr.slice().sort((a, b) => {
        const ta =
          (a.lastMessage?.timestamp &&
            new Date(a.lastMessage.timestamp).getTime()) ||
          (a.lastActivityAt && new Date(a.lastActivityAt).getTime()) ||
          (a.createdAt && new Date(a.createdAt).getTime()) ||
          0;
        const tb =
          (b.lastMessage?.timestamp &&
            new Date(b.lastMessage.timestamp).getTime()) ||
          (b.lastActivityAt && new Date(b.lastActivityAt).getTime()) ||
          (b.createdAt && new Date(b.createdAt).getTime()) ||
          0;
        return tb - ta;
      });
      set({
        threads: sorted,
        totalUnread: data?.totalUnread ?? 0,
        isLoading: false,
        error: null,
      });
      return sorted;
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to get chat threads";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
=======
  set({ isLoading: true, error: null });
  try {
    const res = await api.get("/messages/threads");

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
      isLoading: false,
    });

    return sortedThreads;
  } catch (err) {
    const status = err?.response?.status;
    const body = err?.response?.data;
    const msg =
      body?.error || body?.message || err?.message || "Failed to get chat threads";
    console.error("fetchThreads error:", status, body || msg);
    set({ error: msg, isLoading: false });
    throw new Error(msg);
  }
},

>>>>>>> e99ab674b2d5de3d577bf414f0a6c2e271967d2c

  fetchUnreadTotal: async () => {
    try {
      const { data } = await api.get(ep("/messages/unread-count"));
      const total = typeof data?.total === "number" ? data.total : 0;
      set({ totalUnread: total });
      return total;
    } catch {
      return 0;
    }
  },

  /* Messages */
  fetchMessages: async (chatGroupId) => {
    if (!chatGroupId) return [];
    get().joinRoom(chatGroupId);

    set((s) => ({
      messagesByGroup: {
        ...s.messagesByGroup,
        [chatGroupId]: {
          ...(s.messagesByGroup[chatGroupId] || {}),
          isLoading: true,
        },
      },
      error: null,
    }));

    try {
      const { data } = await api.get(ep(`/messages/${chatGroupId}`));
      const items = Array.isArray(data?.items) ? data.items : [];
      const index = new Set(items.map((m) => m.id));
      const pageInfo = data?.pageInfo || {};
      const hasMore = !!pageInfo?.hasMore;

      set((s) => ({
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: {
            items,
            index,
            pageInfo,
            hasMore,
            isLoading: false,
            hasFetched: true,
            typing: s.messagesByGroup[chatGroupId]?.typing || [],
          },
        },
        threads: s.threads.map((t) =>
          t.id === chatGroupId ? { ...t, unread: 0 } : t
        ),
      }));

      get().fetchUnreadTotal().catch(() => {});
      return items;
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to load messages";
      set((s) => ({
        error: msg,
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: {
            ...(s.messagesByGroup[chatGroupId] || {}),
            isLoading: false,
          },
        },
      }));
      throw new Error(msg);
    }
  },

  markRead: async (chatGroupId) => {
    try {
      await api.put(ep(`/messages/${chatGroupId}/read`));
      set((s) => ({
        threads: s.threads.map((t) =>
          t.id === chatGroupId ? { ...t, unread: 0 } : t
        ),
      }));
      get().fetchUnreadTotal().catch(() => {});
    } catch {}
  },

  /* Send (optimistic) */
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
      sender: me
        ? { id: me.id, username: me.username, avatar: me.avatar }
        : null,
      readBy: me ? [{ id: me.id }] : [],
      createdAt: new Date().toISOString(),
      optimistic: true,
      clientTempId,
    };

    set((s) => {
      const bucket =
        s.messagesByGroup[chatGroupId] || {
          items: [],
          index: new Set(),
          typing: [],
        };
      const items = [...bucket.items, optimistic];
      const index = new Set(bucket.index);
      index.add(tempId);
      const pending = {
        ...(s.pendingByGroup[chatGroupId] || {}),
        [clientTempId]: tempId,
      };
      return {
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: { ...bucket, items, index },
        },
        pendingByGroup: { ...s.pendingByGroup, [chatGroupId]: pending },
      };
    });

    set((s) => ({
      threads: bumpThreadToTop(s.threads, chatGroupId, {
        content: content || (mediaUrl ? "Attachment" : ""),
        timestamp: new Date().toISOString(),
        sender: me ? { username: me.username } : null,
      }),
    }));

    try {
      const { data } = await api.post(ep(`/messages/${chatGroupId}`), {
        content,
        mediaUrl,
        clientTempId,
      });
      get()._reconcile(chatGroupId, data, clientTempId);
      return data;
    } catch (err) {
      set((s) => {
        const bucket =
          s.messagesByGroup[chatGroupId] || {
            items: [],
            index: new Set(),
            typing: [],
          };
        const temp = (s.pendingByGroup[chatGroupId] || {})[clientTempId];
        const items = bucket.items.filter((m) => m.id !== temp);
        const index = new Set(bucket.index);
        index.delete(temp);
        const pending = { ...(s.pendingByGroup[chatGroupId] || {}) };
        delete pending[clientTempId];
        return {
          messagesByGroup: {
            ...s.messagesByGroup,
            [chatGroupId]: { ...bucket, items, index },
          },
          pendingByGroup: { ...s.pendingByGroup, [chatGroupId]: pending },
          error: err?.response?.data?.error || "Failed to send message",
        };
      });
      throw err;
    }
  },

  _reconcile: (chatGroupId, realMessage, clientTempId) => {
    set((s) => {
      const bucket =
        s.messagesByGroup[chatGroupId] || {
          items: [],
          index: new Set(),
          typing: [],
        };
      const pending = { ...(s.pendingByGroup[chatGroupId] || {}) };
      const tempId = clientTempId ? pending[clientTempId] : null;

      let items = bucket.items;
      let index = new Set(bucket.index);

      if (tempId) {
        items = items.map((m) => (m.id === tempId ? realMessage : m));
        index.delete(tempId);
        index.add(realMessage.id);
        delete pending[clientTempId];
      } else if (!index.has(realMessage.id)) {
        items = [...items, realMessage];
        index.add(realMessage.id);
      }

      const threads = bumpThreadToTop(s.threads, chatGroupId, realMessage);

      return {
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: { ...bucket, items, index },
        },
        pendingByGroup: { ...s.pendingByGroup, [chatGroupId]: pending },
        threads,
      };
    });
  },

  /* Typing */
  sendTyping: (chatGroupId, isTyping) => {
    const me = useAuthStore.getState()?.user;
    if (!me || !chatGroupId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit(isTyping ? "typing:start" : "typing:stop", {
      roomId: chatGroupId,
      userId: me.id,
    });

    set((s) => {
      const bucket =
        s.messagesByGroup[chatGroupId] || {
          items: [],
          index: new Set(),
          typing: [],
        };
      const typingSet = new Set(bucket.typing || []);
      if (isTyping) typingSet.add(String(me.id));
      else typingSet.delete(String(me.id));
      return {
        messagesByGroup: {
          ...s.messagesByGroup,
          [chatGroupId]: { ...bucket, typing: Array.from(typingSet) },
        },
      };
    });

    const timers = get()._typingTimers;
    clearTimeout(timers[chatGroupId]);
    if (isTyping) {
      timers[chatGroupId] = setTimeout(() => {
        get().sendTyping(chatGroupId, false);
      }, TYPING_IDLE_MS);
    }
  },

  /* Socket glue: presence + messages + calls */
  bindSocket: (token) => {
    if (get()._socketBound) return;
    const socket = connectSocket(token);
    if (!socket) return;

    // messages
    socket.off("message:new");
    socket.on("message:new", ({ chatGroupId, message, clientTempId }) => {
      get()._reconcile(chatGroupId, message, clientTempId);
      const bucket = get().messagesByGroup[chatGroupId];
      if (!bucket?.hasFetched) {
        set((s) => ({
          threads: s.threads.map((t) =>
            t.id === chatGroupId ? { ...t, unread: (t.unread || 0) + 1 } : t
          ),
          totalUnread: s.totalUnread + 1,
        }));
      }
    });

    socket.off("messages:read");
    socket.on("messages:read", ({ chatGroupId, userId, messageIds }) => {
      set((s) => {
        const bucket = s.messagesByGroup[chatGroupId];
        if (!bucket?.items?.length) return {};
        const items = bucket.items.map((m) =>
          messageIds.includes(m.id)
            ? { ...m, readBy: uniqById([...(m.readBy || []), { id: userId }]) }
            : m
        );
        return {
          messagesByGroup: {
            ...s.messagesByGroup,
            [chatGroupId]: { ...bucket, items },
          },
        };
      });
      get().fetchUnreadTotal().catch(() => {});
    });

    // typing
    socket.off("typing:start");
    socket.on("typing:start", ({ roomId, userId }) => {
      set((s) => {
        const bucket =
          s.messagesByGroup[roomId] || {
            items: [],
            index: new Set(),
            typing: [],
          };
        const setTyping = new Set(bucket.typing || []);
        setTyping.add(String(userId));
        return {
          messagesByGroup: {
            ...s.messagesByGroup,
            [roomId]: { ...bucket, typing: Array.from(setTyping) },
          },
        };
      });
    });
      set(s => ({ onlineUsers: new Set([...s.onlineUsers, userId]) }));

<<<<<<< HEAD
    socket.off("typing:stop");
    socket.on("typing:stop", ({ roomId, userId }) => {
      set((s) => {
        const bucket =
          s.messagesByGroup[roomId] || {
            items: [],
            index: new Set(),
            typing: [],
          };
        const setTyping = new Set(bucket.typing || []);
        setTyping.delete(String(userId));
        return {
          messagesByGroup: {
            ...s.messagesByGroup,
            [roomId]: { ...bucket, typing: Array.from(setTyping) },
          },
        };
      });
    });
=======
    socket.on("presence:online", ({ userId }) => {});
      set(s => {
        const next = new Set(s.onlineUsers);
        next.delete(userId);
        return { onlineUsers: next };
      });
    socket.on("presence:offline", ({ userId }) => {});
    
    // Typing indicators
    socket.on("typing:start", ({ userId, roomId, username }) => {
      set(s => ({
        typingUsers: {
          ...s.typingUsers,
          [roomId]: {
            ...(s.typingUsers[roomId] || {}),
            [userId]: { username: username || 'Someone', timestamp: Date.now() }
          }
        }
      }));
    });
    
    socket.on("typing:stop", ({ userId, roomId }) => {
      set(s => {
        const roomTyping = { ...(s.typingUsers[roomId] || {}) };
        delete roomTyping[userId];
        return {
          typingUsers: { ...s.typingUsers, [roomId]: roomTyping }
        };
      });
    });
    
    socket.on("connect_error", (err) => console.error("socket error", err?.message || err));
>>>>>>> e99ab674b2d5de3d577bf414f0a6c2e271967d2c

    // presence
    socket.off("presence:online");
    socket.on("presence:online", ({ userId }) => {
      set((s) => {
        const next = new Set(s.onlineUserIds);
        next.add(String(userId));
        return { onlineUserIds: next };
      });
    });

    socket.off("presence:offline");
    socket.on("presence:offline", ({ userId }) => {
      set((s) => {
        const next = new Set(s.onlineUserIds);
        next.delete(String(userId));
        return { onlineUserIds: next };
      });
    });

    // calls: show incoming pop
    socket.off("call:offer");
    socket.on("call:offer", ({ roomId, fromUser }) => {
      set({ incomingCall: { roomId: String(roomId), fromUser: fromUser || null } });
    });

    socket.off("call:end");
    socket.on("call:end", () => set({ incomingCall: null }));

    // Add connection status handling
    socket.off("connect");
    socket.on("connect", () => {
      console.log("[Socket] Connected");
      set({ error: null });
    });

    socket.off("disconnect");
    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.off("connect_error");
    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
      set({ error: "Connection failed. Please check your internet connection." });
    });

    set({ _socketBound: true });
  },

  // Typing indicators
  startTyping: (chatGroupId) => {
    const { socket } = get();
    const me = useAuthStore.getState()?.user;
    if (socket && chatGroupId && me) {
      socket.emit("typing:start", { 
        roomId: chatGroupId, 
        userId: me.id, 
        username: me.username 
      });
    }
  },

  stopTyping: (chatGroupId) => {
    const { socket } = get();
    const me = useAuthStore.getState()?.user;
    if (socket && chatGroupId && me) {
      socket.emit("typing:stop", { 
        roomId: chatGroupId, 
        userId: me.id 
      });
    }
  },

  getTypingUsers: (chatGroupId) => {
    const typing = get().typingUsers[chatGroupId] || {};
    const me = useAuthStore.getState()?.user;
    const now = Date.now();
    
    // Filter out expired typing (>3 seconds) and self
    return Object.entries(typing)
      .filter(([userId, data]) => 
        userId !== me?.id && 
        (now - data.timestamp) < 3000
      )
      .map(([userId, data]) => data.username);
  },
  joinRoom: (chatGroupId) => {
    const socket = getSocket();
    const { joinedRooms } = get();
    if (!socket || !chatGroupId || joinedRooms.has(chatGroupId)) return;

    socket.emit("room:join", { chatGroupId }, (ack) => {
      if (!ack?.ok)
        console.warn("[socket] room:join failed", chatGroupId, ack?.error);
    });

    const next = new Set(joinedRooms);
    next.add(chatGroupId);
    set({ joinedRooms: next });
  },

  // Clean up expired typing indicators
  cleanupTyping: () => {
    const now = Date.now();
    set(s => {
      const typingUsers = { ...s.typingUsers };
      Object.keys(typingUsers).forEach(roomId => {
        const roomTyping = { ...typingUsers[roomId] };
        Object.keys(roomTyping).forEach(userId => {
          if (now - roomTyping[userId].timestamp > 3000) {
            delete roomTyping[userId];
          }
        });
        typingUsers[roomId] = roomTyping;
      });
      return { typingUsers };
    });
  },
}));
