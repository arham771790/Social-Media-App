// src/components/messages/ChatHeader.jsx
"use client";

import Link from "next/link";
import { Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ChatHeader({ thread }) {
  if (!thread) return null;
  const name = thread.name;

  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-8 h-8">
          <AvatarImage src={thread.avatar || undefined} />
          <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/u/${name}`} className="font-medium hover:underline truncate">
            {name}
          </Link>
          {thread.type === "DIRECT" ? (
            <div className="text-xs text-muted-foreground truncate">@{name}</div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" title="Audio call"><Phone className="w-5 h-5" /></Button>
        <Button size="icon" variant="ghost" title="Video call"><Video className="w-5 h-5" /></Button>
        <Button size="icon" variant="ghost" title="Info"><Info className="w-5 h-5" /></Button>
      </div>
    </div>
  );
}
