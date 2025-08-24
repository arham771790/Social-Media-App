// src/store/callStore.js
"use client";

import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

/**
 * Simple peer-mesh WebRTC:
 * - One RTCPeerConnection per remote peer (keyed by remote userId)
 * - Signaling over Socket.IO: call:offer/answer/candidate/end
 * - Room scope == chatGroupId
 */

const RTC_CFG = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302"] },
    // Optional TURN for NAT traversal (recommended for prod)
    // { urls: "turn:YOUR_TURN", username: "user", credential: "pass" },
  ],
};

export const useCallStore = create((set, get) => ({
  // local & remote media
  localStream: null,
  remoteStreams: {}, // { [remoteUserId]: MediaStream }

  // peers per remote user
  peers: {}, // { [remoteUserId]: RTCPeerConnection }

  // call state
  inCall: false,
  roomId: null,
  isVideo: true,

  // helpers/state
  _bound: false,

  bindSocket: () => {
    if (get()._bound) return;
    const socket = getSocket();
    if (!socket) return;

    const me = useAuthStore.getState()?.user;

    socket.on("call:offer", async ({ sdp, fromUser }) => {
      if (!fromUser || fromUser.id === me?.id) return;
      await get()._ensureLocal();
      const pc = get()._getOrCreatePeer(fromUser.id);
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { roomId: get().roomId, sdp: answer, fromUser: { id: me.id } });
    });

    socket.on("call:answer", async ({ sdp, fromUser }) => {
      if (!fromUser || fromUser.id === me?.id) return;
      const pc = get().peers[fromUser.id];
      if (!pc) return;
      await pc.setRemoteDescription(sdp);
    });

    socket.on("call:candidate", async ({ candidate, fromUser }) => {
      if (!fromUser || fromUser.id === me?.id) return;
      const pc = get().peers[fromUser.id];
      if (!pc || !candidate) return;
      try { await pc.addIceCandidate(candidate); } catch {}
    });

    socket.on("call:end", ({ reason }) => {
      get().endCall(reason || "ended");
    });

    set({ _bound: true });
  },

  /** Start a call in a room; video=true for A/V, false for audio-only */
  startCall: async (roomId, { video = true } = {}) => {
    const socket = getSocket();
    const me = useAuthStore.getState()?.user;
    if (!socket || !roomId || !me) return;

    set({ roomId, isVideo: video });
    await get()._ensureLocal(video);

    // For peer-mesh: we need an offer per other participant.
    // A simple pattern: emit a "call:offer" to room after creating localDescription;
    // receivers reply with answer; ICE flows via call:candidate.
    // Here we send a "broadcast" offer; each receiver handles it with its own pc.
    const pc = get()._getOrCreatePeer("__BROADCAST__"); // temporary local-only pc
    // We won't actually use this pc for remote tracks, it's just to produce an SDP
    // Better: iterate known participants if you maintain presence-in-room list.

    // Create a throwaway pc to produce an SDP; then close it.
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socket.emit("call:candidate", { roomId, candidate: ev.candidate, fromUser: { id: me.id } });
      }
    };
    const stream = get().localStream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: video });
    await pc.setLocalDescription(offer);

    socket.emit("call:offer", { roomId, sdp: offer, fromUser: { id: me.id } });

    // we don't need this temp pc after initial broadcast
    setTimeout(() => { try { pc.close(); } catch {} }, 0);

    set({ inCall: true });
  },

  /** Hangup */
  endCall: (reason = "hangup") => {
    const socket = getSocket();
    const { peers, localStream, remoteStreams, roomId } = get();

    Object.values(peers).forEach((pc) => { try { pc.ontrack = null; pc.close(); } catch {} });
    Object.values(remoteStreams).forEach((ms) => ms.getTracks().forEach((t) => t.stop()));
    if (localStream) localStream.getTracks().forEach((t) => t.stop());

    set({ peers: {}, remoteStreams: {}, localStream: null, inCall: false, roomId: null });

    if (socket && roomId) socket.emit("call:end", { roomId, reason });
  },

  /** Toggle local mic/video during call */
  toggleTrack: (kind) => {
    const { localStream } = get();
    if (!localStream) return;
    localStream.getTracks().forEach((t) => {
      if ((kind === "audio" && t.kind === "audio") || (kind === "video" && t.kind === "video")) {
        t.enabled = !t.enabled;
      }
    });
  },

  /* -------- internals ---------- */
  _ensureLocal: async (video = true) => {
    let ls = get().localStream;
    if (ls) return ls;
    ls = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    set({ localStream: ls });
    return ls;
  },

  _getOrCreatePeer: (remoteUserId) => {
    const current = get().peers[remoteUserId];
    if (current) return current;

    const me = useAuthStore.getState()?.user;
    const socket = getSocket();
    const pc = new RTCPeerConnection(RTC_CFG);

    // add local tracks
    const stream = get().localStream;
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    // ice
    pc.onicecandidate = (ev) => {
      if (ev.candidate && socket) {
        socket.emit("call:candidate", {
          roomId: get().roomId,
          candidate: ev.candidate,
          fromUser: { id: me?.id },
        });
      }
    };

    // remote media
    pc.ontrack = (ev) => {
      const [ms] = ev.streams;
      if (!ms) return;
      set((s) => ({ remoteStreams: { ...s.remoteStreams, [remoteUserId]: ms } }));
    };

    set((s) => ({ peers: { ...s.peers, [remoteUserId]: pc } }));
    return pc;
  },
}));
