"use client";

import { create } from "zustand";
import toast from "react-hot-toast";
import { getSocket, ring, endCall } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";

export const useCallStore = create((set, get) => ({
  // incoming call snapshot
  incoming: null, // { roomId, fromUser, mode }
  _setIncoming: (v) => set({ incoming: v }),

  // global call panel UI
  ui: { open: false, roomId: null, mode: "audio" },
  uiOpen: (roomId, mode = "audio") => set({ ui: { open: true, roomId, mode } }),
  uiSetOpen: (open) =>
    set((s) => ({ ui: { ...s.ui, open }, ...(open ? {} : { incoming: null }) })),

  // start a call from ChatHeader (sends "ring" first so callee sees toast)
  startCallFromThread: async (roomId, mode = "audio") => {
    const me = useAuthStore.getState().user;
    if (!roomId || !me) return;
    ring(roomId, { fromUser: { id: me.id, username: me.username }, mode });
    get().uiOpen(roomId, mode);
  },

  // Accept/Decline incoming
  acceptIncoming: () => {
    const inc = get().incoming;
    if (!inc) return;
    get().uiOpen(inc.roomId, inc.mode);
    set({ incoming: null });
  },

  declineIncoming: async (reason = "declined") => {
    try {
      const inc = get().incoming;
      if (inc?.roomId) endCall(inc.roomId, reason);
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
