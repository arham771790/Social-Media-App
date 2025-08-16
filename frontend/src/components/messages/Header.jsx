"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Video, Info } from "lucide-react";

export default function Header({ thread, onToggleInfo, onToggleSidebar }) {
  if (!thread) return null;
  return (
    <div className="h-14 border-b border-border px-3 md:px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="md:hidden mr-1 text-sm underline">Chats</button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={thread.avatar || undefined} />
          <AvatarFallback>{(thread.name || "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="leading-tight">
          <Link href={`/u/${thread.name}`} className="font-medium hover:underline block">
            {thread.name}
          </Link>
          <div className="text-xs text-muted-foreground">
            {thread.type === "direct" ? "Direct message" : "Group"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" title="Voice call"><Phone className="w-5 h-5" /></Button>
        <Button size="icon" variant="ghost" title="Video call"><Video className="w-5 h-5" /></Button>
        <Button size="icon" variant="ghost" title="Info" onClick={onToggleInfo}><Info className="w-5 h-5" /></Button>
      </div>
    </div>
  );
}
