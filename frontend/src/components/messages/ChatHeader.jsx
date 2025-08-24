// src/components/messages/ChatHeader.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CallPanel from "@/components/messages/call/CallPanel";

export default function ChatHeader({ thread }) {
  const [callOpen, setCallOpen] = useState(false);
  const [mode, setMode] = useState("audio"); // "audio" | "video"

  if (!thread) return null;
  const name = thread.name;

  return (
    <>
      <div className="h-12 md:h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-background/60 backdrop-blur">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Avatar className="w-7 h-7 md:w-8 md:h-8 shrink-0">
            <AvatarImage src={thread.avatar || undefined} />
            <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <Link
            href={`/u/${name}`}
            className="font-medium hover:underline truncate max-w-[56vw] md:max-w-none"
            title={name}
          >
            {name}
          </Link>
        </div>
        <div className="flex items-center gap-1 md:gap-1.5">
          <button
            className="p-2 rounded hover:bg-muted"
            title="Audio call"
            onClick={() => {
              setMode("audio");
              setCallOpen(true);
            }}
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded hover:bg-muted"
            title="Video call"
            onClick={() => {
              setMode("video");
              setCallOpen(true);
            }}
          >
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 rounded hover:bg-muted hidden sm:inline-flex" title="Info">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CallPanel open={callOpen} onOpenChange={setCallOpen} roomId={thread.id} mode={mode} />
    </>
  );
}
