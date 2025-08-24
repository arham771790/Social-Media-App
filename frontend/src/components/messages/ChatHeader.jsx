"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, Video, Info, Menu, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
<<<<<<< HEAD
import CallPanel from "@/components/messages/call/CallPanel";

export default function ChatHeader({ thread }) {
  const [callOpen, setCallOpen] = useState(false);
  const [mode, setMode] = useState("audio"); // "audio" | "video"

=======
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ChatHeader({ thread, onToggleSidebar }) {
>>>>>>> e99ab674b2d5de3d577bf414f0a6c2e271967d2c
  if (!thread) return null;
  
  const name = thread.name;
  const memberCount = thread.members?.length || 0;

  return (
<<<<<<< HEAD
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
=======
    <div className="h-16 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile: Back/Menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Avatar with status */}
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={thread.avatar || undefined} />
            <AvatarFallback className="bg-muted-foreground/20">
              {name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator for direct chats */}
          {thread.type === "DIRECT" && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
          )}
        </div>

        {/* Chat info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link 
              href={thread.type === "DIRECT" ? `/u/${name}` : "#"} 
              className="font-semibold hover:underline truncate"
            >
              {name}
            </Link>
            {thread.type === "GROUP" && (
              <Badge variant="secondary" className="text-xs">
                {memberCount} members
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {thread.type === "DIRECT" ? (
              <span>Active now</span>
            ) : (
              <span>{memberCount} members</span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <Button 
          size="icon" 
          variant="ghost" 
          className="text-muted-foreground hover:text-foreground"
          title="Audio call"
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="text-muted-foreground hover:text-foreground"
          title="Video call"
        >
          <Video className="w-5 h-5" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="text-muted-foreground hover:text-foreground"
          title="Chat info"
        >
          <Info className="w-5 h-5" />
        </Button>
      </div>
    </div>
>>>>>>> e99ab674b2d5de3d577bf414f0a6c2e271967d2c
  );
}