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
         <div className="flex flex-col h-full bg-card">
      {/* Header */}
             <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-background to-muted/20">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Messages</h2>
          {totalUnread > 0 && (
            <Badge variant="default" className="text-xs shadow-lg animate-pulse">
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="gradient" onClick={onNew} className="gap-2 shadow-sm hover:shadow-md transition-all duration-200">
            <MessageSquarePlus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setGroupOpen(true)}
            className="hidden sm:flex gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200"
          >
            <Users className="w-4 h-4" />
            Group
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !hasThreads && (
        <div className="flex-1 p-6 space-y-4">
                     {Array.from({ length: 5 }).map((_, i) => (
             <div key={i} className="flex items-center gap-4 p-4">
               <Skeleton className="w-12 h-12 rounded-full" />
               <div className="flex-1 space-y-3">
                 <Skeleton className="h-4 w-28" />
                 <Skeleton className="h-3 w-36" />
               </div>
             </div>
           ))}
        </div>
      )}

      {/* List */}
      {hasThreads ? (
        <div className="flex-1 overflow-y-auto">
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
                                     className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-200 hover:bg-muted/30 ${
                     isActive ? "bg-gradient-to-r from-primary/10 to-primary/5 border-r-2 border-primary shadow-sm" : ""
                   }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-border/20 shadow-sm">
                      <AvatarImage src={t.avatar || undefined} />
                      <AvatarFallback className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary font-semibold">
                        {t.type === "GROUP" ? (
                          <Users className="w-6 h-6" />
                        ) : (
                          name[0]?.toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-card shadow-sm animate-pulse" />
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
                      <div className="flex items-center gap-2">
                        {lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lastMessageTime), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                        {t.unread > 0 && (
                          <Badge
                            variant="default"
                            className="text-xs min-w-[20px] h-5 px-1.5"
                          >
                            {t.unread > 99 ? "99+" : t.unread}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Last message preview */}
                    <div className="text-xs text-muted-foreground truncate">
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
        </div>
      ) : !isLoading ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <MessageSquarePlus className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">No conversations yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start a conversation with someone to see your messages here.
            </p>
          </div>
          <Button onClick={onNew} className="gap-2">
            <MessageSquarePlus className="w-4 h-4" />
            Start messaging
          </Button>
        </div>
      ) : null}

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
