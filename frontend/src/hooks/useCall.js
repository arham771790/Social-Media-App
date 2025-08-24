"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/store/chatStore";

export default function useCall({ roomId, mode = "audio" }) {
  const socket = useChatStore((s) => s.socket);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socket || !roomId) return;

    pcRef.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) socket.emit("call:candidate", { roomId, candidate: e.candidate, fromUser: "me" });
    };

    pcRef.current.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteRef.current) remoteRef.current.srcObject = stream;
    };

    // inbound events
    const onOffer = async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const stream = await getMedia(mode);
      stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
      if (localRef.current) localRef.current.srcObject = stream;

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("call:answer", { roomId, sdp: answer, fromUser: "me" });
      startTimer();
    };
    const onAnswer = async ({ sdp }) => {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      startTimer();
    };
    const onCandidate = async ({ candidate }) => {
      if (candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    };
    const onEnd = () => end();

    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:candidate", onCandidate);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:candidate", onCandidate);
      socket.off("call:end", onEnd);
      end();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId, mode]);

  const start = async () => {
    const stream = await getMedia(mode);
    stream.getTracks().forEach((t) => pcRef.current.addTrack(t, stream));
    if (localRef.current) localRef.current.srcObject = stream;

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    useChatStore.getState().socket.emit("call:offer", { roomId, sdp: offer, fromUser: "me" });
    startTimer();
  };

  const end = () => {
    stopTimer();
    if (localRef.current?.srcObject) localRef.current.srcObject.getTracks().forEach((t) => t.stop());
    if (remoteRef.current?.srcObject) remoteRef.current.srcObject.getTracks().forEach((t) => t.stop());
    if (pcRef.current) pcRef.current.close();
    pcRef.current = new RTCPeerConnection();
    setRunning(false);
  };

  const startTimer = () => {
    if (running) return;
    setRunning(true);
    setDuration(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  return { localRef, remoteRef, start, end, duration, running };
}

async function getMedia(mode) {
  const constraints = mode === "video"
    ? { video: { width: 640, height: 360 }, audio: true }
    : { audio: true, video: false };
  return await navigator.mediaDevices.getUserMedia(constraints);
}
