// src/store/messageStore.js
"use client";

import { create } from "zustand";
import api from "@/lib/axios";
import { socketManager } from "@/lib/socketManager";
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
const setGroupBusy = (chatGroupId, busy, set) =>
  set((st) => ({ groupBusyById: { ...st.groupBusyById, [chatGroupId]: !!busy } }));

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
 // group settings state
groupBusyById: {},              // { [groupId]: boolean }  // for add/remove spinners
groupDetailsById: {},           // optional cache if you later add a /messages/:id/details endpoint


  // ----- SOCKET BIND -----
  bindSocket: (token) => {
    const socket = socketManager.connect(token || getToken());
    if (!socket) return;

    socket.off("connect");
    socket.on("connect", async () => {
      const active = get().activeChatId;
      if (active) await socketManager.joinRoom(active);
      set({ socketReady: true });
    });

    // presence
    socket.off("presence:online");
    socket.off("presence:offline");
    socket.on("presence:online", ({ userId }) => {
      set((st) => {
        const setIds = new Set(st.onlineUserIds);
        setIds.add(String(userId));
        return { onlineUserIds: setIds };
      });
    });
    socket.on("presence:offline", ({ userId }) => {
      set((st) => {
        const setIds = new Set(st.onlineUserIds);
        setIds.delete(String(userId));
        return { onlineUserIds: setIds };
      });
    });

    // typing
    socket.off("typing:start");
    socket.off("typing:stop");
    socket.on("typing:start", ({ chatGroupId, userId, username }) => {
      set((st) => {
        const by = { ...(st.typingByGroup || {}) };
        const room = { ...(by[chatGroupId] || {}) };
        room[String(userId)] = username || String(userId);
        by[chatGroupId] = room;
        return { typingByGroup: by };
      });
    });
    socket.on("typing:stop", ({ chatGroupId, userId }) => {
      set((st) => {
        const by = { ...(st.typingByGroup || {}) };
        const room = { ...(by[chatGroupId] || {}) };
        delete room[String(userId)];
        by[chatGroupId] = room;
        return { typingByGroup: by };
      });
    });

    // new message
    socket.off("message:new");
    socket.on("message:new", ({ chatGroupId, message, clientTempId }) => {
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
    socket.off("messages:read");
    socket.on("messages:read", ({ chatGroupId, userId, messageIds }) => {
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
    if (prev && prev !== groupId) await socketManager.leaveRoom(prev);

    set({ activeChatId: groupId });
    if (groupId) {
      await socketManager.joinRoom(groupId);
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
    return await socketManager.joinRoom(groupId);
  },
  leaveRoom: async (groupId) => {
    if (!groupId) return { ok: false };
    return    await socketManager.leaveRoom(groupId);
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
      await api.post(`/messages/${chatGroupId}`, { ...payload, clientTempId,mimeType: payload.mimeType,
  fileType: payload.fileType, });
    } catch (e) {
      set((state) => {
        const list = (state.messagesByGroup[chatGroupId] || []).filter((m) => m.__clientTempId !== clientTempId);
        return { messagesByGroup: { ...state.messagesByGroup, [chatGroupId]: list } };
      });
      throw e;
    }
  },
  sendCallLog: async (chatGroupId, { status, mode = "audio", actor = "self" } = {}) => {
  // Server should treat type=CALL_INVITE messages as system call logs.
  // content example like Instagram: "Missed voice call" / "Video call ended"
  const verb = status === "MISSED" ? "Missed" : "Ended";
  const kind = mode === "video" ? "video" : "voice";
  const content = `${verb} ${kind} call`;

  try {
    await api.post(`/messages/${chatGroupId}`, {
      type: "CALL_INVITE",
      content,
      isSystem: true,
    });
  } catch (e) {
    // not fatal to UI
    console.warn("sendCallLog failed", e?.message || e);
  }
},
  // ----- SEARCH & CREATE -----
  // ----- SEARCH & CREATE -----
searchUsers: async (q) => {
  const params = q?.trim() ? { search: q.trim() } : {};
  const { data } = await api.get("/messages/users", { params });
  return Array.isArray(data) ? data : [];
},

createDirect: async (targetUserId) => {
  const { data } = await api.post("/messages/direct", { targetUserId });

  const t = data?.chatGroup;
  if (!t) return data;

  // Normalize into thread shape
  const newThread = {
    id: t.id,
    name: t.name,
    type: "DIRECT",
    avatar: t.avatar || null,
    members: (t.members || []).map((m) => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar,
    })),
    lastMessage: null,
    unread: 0,
    createdAt: t.createdAt || new Date().toISOString(),
  };

  // Insert at top if not already in list
  set((st) => {
    const exists = st.threads.find((thr) => thr.id === newThread.id);
    return exists ? {} : { threads: [newThread, ...st.threads] };
  });

  return { chatGroup: newThread };
},

createGroup: async (body) => {
  const { name, description, memberIds, imageUrl } = body;

  const { data } = await api.post("/messages/group", {
    name,
    description: description || "",
    memberIds,
    imageUrl: imageUrl || null,
  });

  const newThread = {
    id: data.id,
    name: data.name,
    type: data.type || "GROUP",
    avatar: data.imageUrl || null,
    members: (data.members || []).map((m) => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar,
    })),
    lastMessage: null,
    unread: 0,
    createdAt: data.createdAt || new Date().toISOString(),
  };

  set((st) => {
    const exists = st.threads.find((thr) => thr.id === newThread.id);
    return exists ? {} : { threads: [newThread, ...st.threads] };
  });

  return { chatGroup: newThread };
},

// ----- GROUP SETTINGS -----
addGroupMembersAction: async (chatGroupId, memberIds = []) => {
  if (!chatGroupId || !memberIds.length) return;
  setGroupBusy(chatGroupId, true, set);
  try {
    // POST /messages/:chatGroupId/members  { memberIds: [...] }
    const { data } = await api.post(`/messages/${chatGroupId}/members`, { memberIds });

    // 1) Update the thread in-place (members list + lastActivity if backend returns)
    set((st) => {
      const threads = [...st.threads];
      const idx = threads.findIndex((t) => t.id === chatGroupId);
      if (idx !== -1) {
        const t = { ...threads[idx] };
        // If backend returns full members on "data" (controller does include { members: true })
        // map them to the same shape the sidebar expects:
        if (Array.isArray(data?.members)) {
          t.members = data.members.map((m) => ({
            id: m.id,
            username: m.username,
            avatar: m.avatar,
          }));
        } else {
          // Fallback: optimistic append new IDs with empty usernames
          const existingIds = new Set((t.members || []).map((m) => String(m.id)));
          const appended = memberIds
            .filter((id) => !existingIds.has(String(id)))
            .map((id) => ({ id, username: `user_${id}`, avatar: null }));
          t.members = [...(t.members || []), ...appended];
        }
        threads[idx] = t;
        return { threads };
      }
      return {};
    });

    // 2) Optional cache if you keep a details panel state:
    set((st) => ({
      groupDetailsById: { ...st.groupDetailsById, [chatGroupId]: data || st.groupDetailsById[chatGroupId] },
    }));
    return { ok: true, data };
  } catch (e) {
    console.error("addGroupMembersAction error", e);
    throw e;
  } finally {
    setGroupBusy(chatGroupId, false, set);
  }
},

removeGroupMemberAction: async (chatGroupId, memberId) => {
  if (!chatGroupId || !memberId) return;
  setGroupBusy(chatGroupId, true, set);
  try {
    // DELETE /messages/:chatGroupId/members/:memberId
    await api.delete(`/messages/${chatGroupId}/members/${memberId}`);

    // Update the thread list: drop the member from sidebar data
    set((st) => {
      const threads = [...st.threads];
      const idx = threads.findIndex((t) => t.id === chatGroupId);
      if (idx !== -1) {
        const t = { ...threads[idx] };
        t.members = (t.members || []).filter((m) => String(m.id) !== String(memberId));
        threads[idx] = t;
        return { threads };
      }
      return {};
    });

    // If you cache details:
    set((st) => {
      const details = { ...(st.groupDetailsById || {}) };
      if (details[chatGroupId]?.members) {
        details[chatGroupId] = {
          ...details[chatGroupId],
          members: details[chatGroupId].members.filter(
            (m) => String(m.id) !== String(memberId)
          ),
        };
      }
      return { groupDetailsById: details };
    });

    return { ok: true };
  } catch (e) {
    console.error("removeGroupMemberAction error", e);
    throw e;
  } finally {
    setGroupBusy(chatGroupId, false, set);
  }
},

leaveGroupAction: async (chatGroupId) => {
  if (!chatGroupId) return;
  setGroupBusy(chatGroupId, true, set);
  try {
    // Using the self-removal rule via existing endpoint:
    const me = getUser();
    await api.delete(`/messages/${chatGroupId}/members/${me?.id}`);

    // Remove thread locally
    set((st) => ({ threads: st.threads.filter(t => t.id !== chatGroupId) }));

    // Cleanup caches
    set((st) => {
      const mbg = { ...st.messagesByGroup }; delete mbg[chatGroupId];
      const pib = { ...st.pageInfoByGroup }; delete pib[chatGroupId];
      return { messagesByGroup: mbg, pageInfoByGroup: pib };
    });

    // Clear active if needed
    if (get().activeChatId === chatGroupId) set({ activeChatId: null });
    return { ok: true };
  } catch (e) {
    console.error("leaveGroupAction error", e);
    throw e;
  } finally {
    setGroupBusy(chatGroupId, false, set);
  }
},

  // ----- TYPING -----
  startTyping: (chatGroupId) => {
    const me = getUser();
    socketManager.emitTyping("start", { chatGroupId, username: me?.username, userId: me?.id });
  },
  stopTyping: (chatGroupId) => {
    const me = getUser();
    socketManager.emitTyping("stop", { chatGroupId, userId: me?.id });
  },
}));
