"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Phone, Video, Info, ChevronLeft } from "lucide-react";

/**
 * Responsive chat header
 * - Mobile (sm): compact, back chevron, avatar, name, info button
 * - Desktop (md+): full actions (voice, video, info)
 */
export default function Header({
  thread,
  onToggleInfo,
  onToggleSidebar, // on mobile, this acts as "back to chats"
  compact = false, // allow a compact mode if you need
  isFetching = false, // optional: to show thin top progress bar in parent
}) {
  if (!thread) return null;

  const type = (thread?.type || "").toUpperCase();
  const usernamePath =
    thread?.slug || thread?.handle || thread?.name || String(thread?.id || "");

  return (
    <div className="h-12 md:h-14 border-b border-border px-2 md:px-4 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* Left: back (mobile) + avatar + name */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden -ml-1 p-1 rounded hover:bg-muted"
          aria-label="Back to chats"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <Avatar className="h-8 w-8 md:h-9 md:w-9">
          <AvatarImage src={thread.avatar || undefined} />
          <AvatarFallback>
            {(thread.name || "?")[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="leading-tight min-w-0">
          <Link
            href={`/u/${usernamePath}`}
            className="font-medium hover:underline block truncate"
            title={thread.name}
          >
            {thread.name}
          </Link>
          <div className="text-[11px] md:text-xs text-muted-foreground truncate">
            {type === "DIRECT" ? "Direct message" : "Group"}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 md:gap-1.5">
        {/* Desktop-only call controls */}
        <Button size="icon" variant="ghost" title="Voice call" className="hidden md:inline-flex">
          <Phone className="w-5 h-5" />
        </Button>
        <Button size="icon" variant="ghost" title="Video call" className="hidden md:inline-flex">
          <Video className="w-5 h-5" />
        </Button>

        {/* Info (mobile + desktop) */}
        <Button
          size="icon"
          variant="ghost"
          title="Info"
          onClick={onToggleInfo}
          aria-label="Thread info"
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
