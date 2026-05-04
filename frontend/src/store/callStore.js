"use client";

import { create } from "zustand";
import { socketManager } from "@/lib/socketManager";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import api from "@/lib/axios";

const FALLBACK_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export const useCallStore = create((set, get) => ({
  // incoming call snapshot
  incoming: null, // { roomId, fromUser, mode }
  _setIncoming: (v) => set({ incoming: v }),

  iceServers: null,
  fetchIceServers: async () => {
    if (get().iceServers) return get().iceServers;
    try {
      const res = await api.get("/calls/ice-servers");
      set({ iceServers: res.data });
      return res.data;
    } catch (err) {
      console.error("Failed to fetch ICE servers, using fallback", err);
      set({ iceServers: FALLBACK_ICE_SERVERS });
      return FALLBACK_ICE_SERVERS;
    }
  },

  // global call panel UI
  ui: { open: false, roomId: null, mode: "audio", isCaller: false },
  uiOpen: (roomId, mode = "audio", isCaller = false) => 
    set({ ui: { open: true, roomId, mode, isCaller } }),
  uiSetOpen: (open) =>
    set((s) => ({ ui: { ...s.ui, open }, ...(open ? {} : { incoming: null }) })),

  // start a call from ChatHeader (sends "ring" first so callee sees toast)
  startCallFromThread: async (roomId, mode = "audio") => {
    const me = useAuthStore.getState().user;
    if (!roomId || !me) return;
    socketManager.ring(roomId, { fromUser: { id: me.id, username: me.username }, mode });
    get().uiOpen(roomId, mode, true);
  },

  // Accept/Decline incoming
  acceptIncoming: () => {
    const inc = get().incoming;
    if (!inc) return;
    get().uiOpen(inc.roomId, inc.mode, false);
    set({ incoming: null });
  },

  declineIncoming: async (reason = "declined") => {
    try {
      const inc = get().incoming;
      if (inc?.roomId) socketManager.endCall(inc.roomId, reason);
      // log missed/declined
      if (inc?.roomId) {
        await useMessageStore.getState().sendCallLog(inc.roomId, {
          status: reason === "declined" ? "MISSED" : "ENDED",
          mode: inc.mode,
          actor: "callee",
        });
      }
    } finally {
      set({ incoming: null });
    }
  },
}));
