"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff, Video as VideoIcon, Mic, MicOff } from "lucide-react";
import { socketManager } from "@/lib/socketManager";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import { useCallStore } from "@/store/callStore";

export default function CallPanel({ open, onOpenChange, roomId, mode = "audio", isCaller = false }) {
  const me = useAuthStore((s) => s.user);
  const logCall = useMessageStore((s) => s.sendCallLog);
  const fetchIceServers = useCallStore((s) => s.fetchIceServers);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localRef = useRef(null);
  const candidatesBuffer = useRef([]);
  const remoteReady = useRef(false);
  const callerStartedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [duration, setDuration] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");
  const isVideo = mode === "video";

  useEffect(() => {
    let interval;
    if (connected) {
      setDuration(0);
      interval = setInterval(() => setDuration((prev) => prev + 1), 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [connected]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const cleanup = () => {
    try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { }
    try { pcRef.current?.close(); } catch { }
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    localStreamRef.current = null;
    pcRef.current = null;
    candidatesBuffer.current = [];
    remoteReady.current = false;
    callerStartedRef.current = false;
    setConnected(false);
    setMicOn(false);
    setCamOn(false);
    setDuration(0);
  };

  useEffect(() => {
    if (!open) return;

    let pc = null;
    const s = socketManager.getSocket();
    let isMounted = true;
    let joinedRoom = false;
    remoteReady.current = false;
    callerStartedRef.current = false;
    setMicOn(true);
    setCamOn(isVideo);

    const initCall = async () => {
      try {
        if (s) {
          const joinAck = await socketManager.joinRoom(roomId);
          if (!isMounted) return;
          if (!joinAck?.ok) {
            throw new Error(joinAck?.error || "failed to join call room");
          }
          joinedRoom = true;
        }

        const iceServers = await fetchIceServers();
        if (!isMounted) return;

        pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

        pc.onconnectionstatechange = () => {
          const st = pc.connectionState;
          if (st === "connected") setConnected(true);
          if (st === "failed" || st === "disconnected" || st === "closed") {
            setConnected(false);
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socketManager.sendCandidate(roomId, e.candidate.toJSON(), { id: me?.id });
          }
        };

        pc.ontrack = (e) => {
          const [stream] = e.streams;
          if (!stream) return;
          if (isVideo) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
          } else if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
          }
        };

        // Let others know we are ready to receive an offer
        if (!isCaller && s) {
          s.emit("call:ready", { roomId, fromUser: { id: me?.id } });
        } else if (isCaller && remoteReady.current) {
          // If we're the caller and the callee is already ready, start now
          startAsCaller();
        }
      } catch (err) {
        console.error("Failed to initialize call", err);
        cleanup();
        onOpenChange?.(false);
      }
    };

    initCall();

    const processBufferedCandidates = async () => {
      while (candidatesBuffer.current.length > 0) {
        const candidate = candidatesBuffer.current.shift();
        try {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Error adding buffered candidate", err);
        }
      }
    };

    const startAsCaller = async () => {
      try {
        if (!pcRef.current || callerStartedRef.current) return;
        callerStartedRef.current = true;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));

        const offer = await pcRef.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
        await pcRef.current.setLocalDescription(offer);
        socketManager.sendOffer(roomId, offer, { id: me?.id });
        setMicOn(true);
        setCamOn(isVideo);
        
        await processBufferedCandidates();
      } catch (err) {
        callerStartedRef.current = false;
        console.error("Failed to start as caller", err);
      }
    };

    const onReady = ({ roomId: eventRoomId }) => {
      if (eventRoomId !== roomId) return;
      if (isCaller) {
        if (pcRef.current) {
          startAsCaller();
        } else {
          remoteReady.current = true;
        }
      }
    };

    const onOffer = async ({ roomId: eventRoomId, sdp }) => {
      if (eventRoomId !== roomId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;
        stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
        
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketManager.sendAnswer(roomId, answer, { id: me?.id });
        setMicOn(true);
        setCamOn(isVideo);

        await processBufferedCandidates();
      } catch (err) {
        console.error("Error handling offer", err);
      }
    };

    const onAnswer = async ({ roomId: eventRoomId, sdp }) => {
      if (eventRoomId !== roomId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        await processBufferedCandidates();
      } catch (err) {
        console.error("Error handling answer", err);
      }
    };

    const onCandidate = async ({ roomId: eventRoomId, candidate }) => {
      if (eventRoomId !== roomId || !candidate) return;
      if (pcRef.current?.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Error adding candidate", err);
        }
      } else {
        candidatesBuffer.current.push(candidate);
      }
    };

    const onEnd = async ({ roomId: eventRoomId, reason }) => {
      if (eventRoomId && eventRoomId !== roomId) return;
      await logCall(roomId, {
        status: reason === "missed" || reason === "declined" ? "MISSED" : "ENDED",
        mode,
        actor: "other",
      });
      cleanup();
      onOpenChange?.(false);
    };

    if (s) {
      s.on("call:ready", onReady);
      s.on("call:offer", onOffer);
      s.on("call:answer", onAnswer);
      s.on("call:candidate", onCandidate);
      s.on("call:end", onEnd);
    }

    return () => {
      isMounted = false;
      if (s) {
        s.off("call:ready", onReady);
        s.off("call:offer", onOffer);
        s.off("call:answer", onAnswer);
        s.off("call:candidate", onCandidate);
        s.off("call:end", onEnd);
        if (joinedRoom) {
          socketManager.leaveRoom(roomId);
        }
      }
      cleanup();
    };
  }, [open, roomId, mode, isCaller, fetchIceServers, me?.id]);

  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks?.() || [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  };
  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks?.() || [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setCamOn((v) => !v);
  };

  const hangUp = async () => {
    socketManager.endCall(roomId, "user_end");
    await logCall(roomId, { status: connected ? "ENDED" : "MISSED", mode, actor: "self" });
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? null : hangUp()}>
      <DialogContent className="sm:max-w-xl !bg-white/75 border border-border/60 shadow-2xl backdrop-blur-xl p-0 overflow-hidden">
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-white/40 to-white/10">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            {isVideo ? <VideoIcon className="w-5 h-5 text-indigo-500" /> : <Mic className="w-5 h-5 text-indigo-500" />}
            {isVideo ? "Video Call" : "Audio Call"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
            </span>
            {connected ? `Connected • ${formatDuration(duration)}` : "Connecting…"} 
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5">
          <div className={["grid gap-3 sm:gap-4 rounded-lg", isVideo ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"].join(" ")}>
            <div className={["relative overflow-hidden rounded-lg ring-1 ring-border/60 bg-gradient-to-br from-gray-900 to-black",
              isVideo ? "aspect-video" : "h-48 sm:h-56 grid place-items-center"].join(" ")}>
              <video ref={localRef} autoPlay muted playsInline
                className={["w-full h-full object-cover", isVideo ? "" : "hidden"].join(" ")} />
              
              {!isVideo && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-colors duration-500 ${micOn ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-red-500/10 text-red-400'}`}>
                    {micOn && connected && <div className="absolute inset-0 rounded-full border-2 border-indigo-400/30 animate-ping" style={{ animationDuration: '2s' }}></div>}
                    {micOn ? <Mic className="w-8 h-8 z-10" /> : <MicOff className="w-8 h-8 z-10" />}
                  </div>
                  <span className={`mt-4 text-sm font-medium transition-colors ${micOn ? 'text-indigo-200' : 'text-red-300/80'}`}>
                    {micOn ? "Microphone active" : "Microphone muted"}
                  </span>
                </div>
              )}
              <div className="absolute left-2 bottom-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px]">You</span>
                {isVideo && !camOn && (
                  <span className="px-2 py-0.5 rounded bg-black/60 text-white text-[11px]">Camera Off</span>
                )}
              </div>
            </div>

            {/* Remote video/audio - always rendered to handle audio tracks even if hidden */}
            <div className={["relative overflow-hidden rounded-lg ring-1 ring-border/60 bg-black", 
              isVideo ? "aspect-video" : "hidden"].join(" ")}>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute left-2 bottom-2 px-2 py-0.5 rounded bg-white/20 text-white text-[11px]">Remote</div>
            </div>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>

          <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
            <Button variant="outline" size="sm" className="rounded-full backdrop-blur-sm bg-white/60 border-border/60"
              onClick={toggleMic} title={micOn ? "Mute microphone" : "Unmute microphone"}>
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>

            {isVideo && (
              <Button variant="outline" size="sm" className="rounded-full backdrop-blur-sm bg-white/60 border-border/60"
                onClick={toggleCam} title={camOn ? "Turn camera off" : "Turn camera on"}>
                {camOn ? <VideoIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4 text-muted-foreground" />}
              </Button>
            )}

            <Button variant="destructive" size="sm" onClick={hangUp} className="rounded-full gap-2" title="End call">
              <PhoneOff className="w-4 h-4" /> End
            </Button>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-white/50 backdrop-blur-md" />
      </DialogContent>
    </Dialog>
  );
}
