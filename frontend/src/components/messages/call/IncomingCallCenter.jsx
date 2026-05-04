"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { PhoneIncoming, Phone, PhoneOff, Video } from "lucide-react";
import { useCallStore } from "@/store/callStore";
import { socketManager } from "@/lib/socketManager";
import { Button } from "@/components/ui/button";

export default function IncomingCallCenter() {
  const acceptIncoming = useCallStore((s) => s.acceptIncoming);
  const declineIncoming = useCallStore((s) => s.declineIncoming);
  const setIncoming = useCallStore((s) => s._setIncoming);
  const incoming = useCallStore((s) => s.incoming);

  const toastIdRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let s = null;
    let interval = null;

    const onRing = ({ roomId, fromUser, mode = "audio" }) => {
      if (useCallStore.getState().incoming) return;

      setIncoming({ roomId, fromUser, mode });

      const content = (t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                  <PhoneIncoming className="w-5 h-5" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {mode === "video" ? "Video Call" : "Audio Call"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {fromUser?.username ? `@${fromUser.username}` : "Someone"} is calling you...
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                declineIncoming();
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none"
            >
              Decline
            </button>
            <button
              onClick={() => {
                acceptIncoming();
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
            >
              Accept
            </button>
          </div>
        </div>
      );

      toastIdRef.current = toast.custom(content, { duration: 30000 });

      if (audioRef.current) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(() => {
          console.log("User interaction required for audio");
        });
      }
    };

    const onEnd = () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIncoming(null);
    };

    const setupSocket = () => {
      s = socketManager.getSocket();
      if (s) {
        s.on("call:ring", onRing);
        s.on("call:end", onEnd);
        if (interval) clearInterval(interval);
      }
    };

    setupSocket();
    if (!s) {
      interval = setInterval(setupSocket, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (s) {
        s.off("call:ring", onRing);
        s.off("call:end", onEnd);
      }
      onEnd();
    };
  }, [acceptIncoming, declineIncoming, setIncoming]);

  // Handle cleanup if incoming state is cleared from elsewhere
  useEffect(() => {
    if (!incoming && toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [incoming]);

  return (
    <audio ref={audioRef} src="/ringtone.mp3" preload="auto" />
  );
}
