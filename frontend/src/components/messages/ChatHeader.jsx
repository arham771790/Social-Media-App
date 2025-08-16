"use client";
import Link from "next/link";
import { Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatHeader({ thread }) {
  if (!thread) return null;
  const name = thread.name;
  return (
    <div className="h-14 border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={thread.avatar || undefined} />
          <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <Link
          href={`/u/${name}`}
          className="font-medium hover:underline truncate"
        >
          {name}
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded hover:bg-muted" title="Audio call">
          <Phone className="w-5 h-5" />
        </button>
        <button className="p-2 rounded hover:bg-muted" title="Video call">
          <Video className="w-5 h-5" />
        </button>
        <button className="p-2 rounded hover:bg-muted" title="Info">
          <Info className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
