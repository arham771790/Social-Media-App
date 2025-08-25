// src/components/messages/call/IncomingCallToast.jsx
"use client";

import { useEffect, useRef } from "react";
import { PhoneIncoming, Phone, PhoneOff } from "lucide-react";
import { useChatStore } from "@/store/messageStore";
import { Button } from "@/components/ui/button";

export default function IncomingCallToast({ onAccept }) {
  const incoming = useChatStore((s) => s.incomingCall);
  const clear = () => useChatStore.setState({ incomingCall: null });
  const audioRef = useRef(null);

  useEffect(() => {
    if (!incoming) return;
    try {
      audioRef.current?.play().catch(() => {});
    } catch {}
    const t = setInterval(() => {
      try { audioRef.current?.play().catch(() => {}); } catch {}
    }, 3500);
    return () => clearInterval(t);
  }, [incoming]);

  if (!incoming) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-[92vw] max-w-sm rounded-xl border bg-background shadow-xl p-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded bg-blue-600/10 text-blue-600">
          <PhoneIncoming className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">
            Incoming {incoming?.fromUser?.username ? `call from @${incoming.fromUser.username}` : "call"}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            Room: {incoming.roomId}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={clear}>
          <PhoneOff className="w-4 h-4 mr-1" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onAccept?.(incoming.roomId);
            clear();
            // store active chat id for page auto-select
            try { localStorage.setItem("activeChatId", incoming.roomId); } catch {}
          }}
        >
          <Phone className="w-4 h-4 mr-1" />
          Accept
        </Button>
      </div>

      {/* tiny ringtone element */}
      <audio ref={audioRef} preload="auto" src="/ringtone.mp3" />
    </div>
  );
}
