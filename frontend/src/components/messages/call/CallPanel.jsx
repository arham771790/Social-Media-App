// src/components/messages/call/CallPanel.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";
import { getSocket, sendOffer, sendAnswer, sendCandidate, endCall } from "@/lib/socket";
import { useAuthStore } from "@/store/authStore";

export default function CallPanel({ open, onOpenChange, roomId, mode = "audio" }) {
  const me = useAuthStore((s) => s.user);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteRef = useRef(null);
  const localRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const isVideo = mode === "video";

  // setup
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
      if (remoteRef.current) {
        remoteRef.current.srcObject = e.streams[0];
      }
    };

    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(roomId, offer, { id: me?.id });
      setInCall(true);
    })();

    // socket listeners for signaling
    const s = getSocket();
    const onOffer = async ({ sdp, fromUser }) => {
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
    };
    const onAnswer = async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };
    const onCandidate = async ({ candidate }) => {
      if (!pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_) {}
    };
    const onEnd = () => {
      cleanup();
      onOpenChange?.(false);
    };

    s.on("call:offer", onOffer);
    s.on("call:answer", onAnswer);
    s.on("call:candidate", onCandidate);
    s.on("call:end", onEnd);

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
    };

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
      <DialogContent className="sm:max-w-xl">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <video ref={localRef} autoPlay muted playsInline className={`w-full rounded ${isVideo ? "" : "hidden"}`} />
            <video ref={remoteRef} autoPlay playsInline className={`w-full rounded ${isVideo ? "" : "hidden"}`} />
          </div>
          {!isVideo && (
            <div className="text-sm text-muted-foreground">
              In audio call… (microphone active)
            </div>
          )}
          <div className="flex justify-center">
            <Button variant="destructive" onClick={hangUp} className="gap-2">
              <PhoneOff className="w-4 h-4" />
              End Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
