// src/components/messages/ConversationList.jsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NewGroupDialog from "@/components/messages/dialogs/NewGroupDialog";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";

export default function ConversationList({
  threads,
  activeId,
  onPick,
  onNew,
  totalUnread = 0,
  isLoading = false,
}) {
  const [groupOpen, setGroupOpen] = useState(false);
  const me = useAuthStore((s) => s.user);
  const onlineIds = useMessageStore((s) => s.onlineUserIds);
  const hasThreads = threads?.length > 0;

  const isThreadOnline = (t) => {
    const myId = String(me?.id || "");
    const members = t?.members || [];
    if (t?.type === "DIRECT") {
      const other = members.find((m) => String(m.id) !== myId);
      return other ? onlineIds.has(String(other.id)) : false;
    }
    return members.some(
      (m) => String(m.id) !== myId && onlineIds.has(String(m.id))
    );
  };

  return (
    <div className="flex flex-col h-full bg-card w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 flex items-center justify-between bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          Messages
        </h2>

        <div className="flex items-center gap-2">
          <Button
            onClick={onNew}
            className="rounded-full shadow-sm hover:shadow-md transition-all duration-200 px-3 h-9"
            variant="gradient"
          >
            <MessageSquarePlus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">New</span>
          </Button>

          <Button
            onClick={() => setGroupOpen(true)}
            className="h-9 w-9 sm:w-auto sm:px-3 rounded-full hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
            variant="outline"
            aria-label="New group"
          >
            <Users className="h-4 w-4 sm:mr-1" />
            <span className="hidden md:inline">Group</span>
          </Button>
        </div>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar"
        style={{ maxHeight: "calc(100vh - 120px)" }} // ✅ ensures desktop scroll
      >
        {isLoading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-4 px-4 sm:px-6 py-3 sm:py-4"
              >
                <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              </li>
            ))}
          </ul>
        ) : hasThreads ? (
          <ul className="divide-y divide-border">
            {threads.map((t) => {
              const name = t.name || "Unknown";
              const isActive = activeId === t.id;
              const lastMessageTime = t.lastMessage?.timestamp || t.createdAt;
              const online = isThreadOnline(t);

              return (
                <li
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  className={[
                    "flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 cursor-pointer transition-colors duration-200 hover:bg-muted/30",
                    isActive
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 border-r-2 border-primary shadow-sm"
                      : "",
                  ].join(" ")}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-border/20 shadow-sm">
                      <AvatarImage src={t.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold">
                        {t.type === "GROUP" ? (
                          <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                        ) : (
                          name[0]?.toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 border-2 border-card shadow-sm" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-medium truncate ${
                          isActive ? "text-foreground" : ""
                        }`}
                      >
                        {name}
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {lastMessageTime && (
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(lastMessageTime), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                        {t.unread > 0 && (
                          <Badge
                            variant="default"
                            className="text-[10px] sm:text-xs min-w-[18px] sm:min-w-[20px] h-4 sm:h-5 px-1"
                          >
                            {t.unread > 99 ? "99+" : t.unread}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-[11px] sm:text-xs text-muted-foreground truncate max-w-full">
                      {t.lastMessage ? (
                        <>
                          {t.lastMessage.sender?.username &&
                            t.type === "GROUP" && (
                              <span className="font-medium">
                                {t.lastMessage.sender.username}:
                              </span>
                            )}
                          <span className="ml-1">
                            {t.lastMessage.content ||
                              (t.lastMessage.type === "IMAGE"
                                ? "📷 Photo"
                                : t.lastMessage.type === "VIDEO"
                                ? "🎥 Video"
                                : t.lastMessage.type === "FILE"
                                ? "📎 File"
                                : "Message")}
                          </span>
                        </>
                      ) : (
                        <span className="italic">No messages yet</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
              <MessageSquarePlus className="w-7 h-7 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="font-semibold text-sm sm:text-base">
                No conversations yet
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-[220px] sm:max-w-sm">
                Start a conversation with someone to see your messages here.
              </p>
            </div>
            <Button
              onClick={onNew}
              className="gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Start messaging</span>
            </Button>
          </div>
        )}
      </div>

      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={(id) => {
          setGroupOpen(false);
          onPick?.(id);
        }}
      />
    </div>
  );
}
