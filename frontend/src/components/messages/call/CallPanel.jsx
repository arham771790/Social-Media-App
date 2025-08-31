// src/components/messages/call/CallPanel.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff, Video as VideoIcon, Mic, MicOff } from "lucide-react";
import { getSocket, sendOffer, sendAnswer, sendCandidate, endCall } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

export default function CallPanel({ open, onOpenChange, roomId, mode = "audio" }) {
  const me = useAuthStore((s) => s.user);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteRef = useRef(null);
  const localRef = useRef(null);

  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");

  const isVideo = mode === "video";

  // Toggle mic/cam (local tracks only)
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

  useEffect(() => {
    if (!open) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) sendCandidate(roomId, e.candidate.toJSON(), { id: me?.id });
    };
    pc.ontrack = (e) => {
      if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
    };

    const start = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(roomId, offer, { id: me?.id });
      setInCall(true);
      setMicOn(true);
      setCamOn(isVideo);
    };

    const s = getSocket();

    const onOffer = async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      sendAnswer(roomId, answer, { id: me?.id });
      setInCall(true);
      setMicOn(true);
      setCamOn(isVideo);
    };

    const onAnswer = async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const onCandidate = async ({ candidate }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    const cleanup = () => {
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      try {
        pcRef.current?.close();
      } catch {}
      localStreamRef.current = null;
      pcRef.current = null;
      setInCall(false);
      setMicOn(false);
      setCamOn(false);
    };

    const onEnd = () => {
      cleanup();
      onOpenChange?.(false);
    };

    // bind
    s.on("call:offer", onOffer);
    s.on("call:answer", onAnswer);
    s.on("call:candidate", onCandidate);
    s.on("call:end", onEnd);

    start();

    return () => {
      s.off("call:offer", onOffer);
      s.off("call:answer", onAnswer);
      s.off("call:candidate", onCandidate);
      s.off("call:end", onEnd);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomId, mode]);

  const hangUp = () => {
    endCall(roomId, "user_end");
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-xl 
          !bg-white/75 
          border border-border/60 
          shadow-2xl 
          backdrop-blur-xl 
          supports-[backdrop-filter]:bg-white/60
          p-0 overflow-hidden
        "
      >
        {/* Header – align with NewMessageDialog style */}
        <DialogHeader className="px-5 py-4 border-b border-border/60 bg-gradient-to-br from-white/40 to-white/10">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            {isVideo ? "Video Call" : "Audio Call"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {inCall ? "Connected" : "Connecting…"} • Room {roomId?.slice?.(0, 8) || "–"}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {/* Video tiles */}
          <div
            className={[
              "grid gap-3 sm:gap-4 rounded-lg",
              isVideo ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
            ].join(" ")}
          >
            {/* Local */}
            <div
              className={[
                "relative overflow-hidden rounded-lg ring-1 ring-border/60 bg-black",
                isVideo ? "aspect-video" : "h-36 sm:h-40 grid place-items-center",
              ].join(" ")}
            >
              <video
                ref={localRef}
                autoPlay
                muted
                playsInline
                className={["w-full h-full object-cover", isVideo ? "" : "hidden"].join(" ")}
              />
              {!isVideo && (
                <div className="text-white/80 text-sm flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Your microphone is active
                </div>
              )}
              {/* Local badges */}
              <div className="absolute left-2 bottom-2 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[11px]">
                  You
                </span>
                {isVideo && !camOn && (
                  <span className="px-2 py-0.5 rounded bg-black/60 text-white text-[11px]">
                    Camera Off
                  </span>
                )}
              </div>
            </div>

            {/* Remote */}
            {isVideo && (
              <div className="relative overflow-hidden rounded-lg ring-1 ring-border/60 bg-black aspect-video">
                <video
                  ref={remoteRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute left-2 bottom-2 px-2 py-0.5 rounded bg-white/20 text-white text-[11px]">
                  Remote
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-4 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full backdrop-blur-sm bg-white/60 border-border/60"
              onClick={toggleMic}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </Button>

            {isVideo && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full backdrop-blur-sm bg-white/60 border-border/60"
                onClick={toggleCam}
                title={camOn ? "Turn camera off" : "Turn camera on"}
              >
                <VideoIcon className="w-4 h-4" />
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={hangUp}
              className="rounded-full gap-2"
              title="End call"
            >
              <PhoneOff className="w-4 h-4" />
              End
            </Button>
          </div>
        </div>

        {/* Footer (subtle bar like NewMessageDialog) */}
        <DialogFooter className="px-5 py-3 border-t border-border/60 bg-white/50 backdrop-blur-md" />
      </DialogContent>
    </Dialog>
  );
}
