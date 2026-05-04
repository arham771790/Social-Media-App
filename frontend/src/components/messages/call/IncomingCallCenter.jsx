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
    const s = socketManager.getSocket();
    if (!s) return;

    const onRing = ({ roomId, fromUser, mode = "audio" }) => {
      // Save incoming state in store (so accept can work from anywhere)
      setIncoming({ roomId, fromUser, mode });

      // show persistent toast
      const content = () => (
        <div className="w-[92vw] max-w-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-blue-600/10 text-blue-600">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                Incoming {mode === "video" ? "video" : "audio"} call
                {fromUser?.username ? ` from @${fromUser.username}` : ""}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Room: {roomId}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                declineIncoming("declined");
                if (toastIdRef.current) toast.dismiss(toastIdRef.current);
              }}
            >
              <PhoneOff className="w-4 h-4 mr-1" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => {
                acceptIncoming();
                if (toastIdRef.current) toast.dismiss(toastIdRef.current);
              }}
            >
              {mode === "video" ? (
                <Video className="w-4 h-4 mr-1" />
              ) : (
                <Phone className="w-4 h-4 mr-1" />
              )}
              Accept
            </Button>
          </div>

          <audio ref={audioRef} preload="auto" src="/ringtone.mp3" />
        </div>
      );

      // NOTE: no autoClose
      toastIdRef.current = toast.custom(content, { duration: Infinity });

      // loop ringtone gently
      const playLoop = () => {
        try {
          audioRef.current?.play().catch(() => { });
        } catch { }
      };
      playLoop();
      const t = setInterval(playLoop, 3500);

      const stop = () => {
        clearInterval(t);
        try {
          audioRef.current && (audioRef.current.pause(), (audioRef.current.currentTime = 0));
        } catch { }
      };

      // stop on accept/decline/end
      const off = () => {
        stop();
        if (toastIdRef.current) toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      };
      useCallStore.subscribe((st) => {
        if (!st.incoming) off();
      });

      s.once("call:end", off);
    };

    s.on("call:ring", onRing);
    return () => {
      s.off("call:ring", onRing);
    };
  }, [acceptIncoming, declineIncoming, setIncoming]);

  return null; // headless; just binds to socket + toast
}
