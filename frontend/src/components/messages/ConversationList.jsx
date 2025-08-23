"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ConversationList({ 
  threads, 
  activeId, 
  onPick, 
  onNew, 
  totalUnread = 0,
  isLoading = false 
}) {
  const hasThreads = threads?.length > 0;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Messages</h2>
          {totalUnread > 0 && (
            <Badge variant="default" className="text-xs">
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onNew}
          className="gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && !hasThreads && (
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations List */}
      {hasThreads ? (
        <div className="flex-1 overflow-y-auto">
          <ul className="divide-y divide-border">
            {threads.map((t) => {
              const name = t.name || "Unknown";
              const isActive = activeId === t.id;
              const lastMessageTime = t.lastMessage?.timestamp || t.createdAt;
              
              return (
                <li
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  className={`
                    flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    hover:bg-muted/50
                    ${isActive ? "bg-muted border-r-2 border-primary" : ""}
                  `}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={t.avatar || undefined} />
                      <AvatarFallback className="bg-muted-foreground/20">
                        {t.type === "GROUP" ? (
                          <Users className="w-6 h-6" />
                        ) : (
                          name[0]?.toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator for direct chats */}
                    {t.type === "DIRECT" && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium truncate ${isActive ? "text-foreground" : ""}`}>
                        {name}
                      </span>
                      <div className="flex items-center gap-2">
                        {lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lastMessageTime), { addSuffix: false })}
                          </span>
                        )}
                        {t.unread > 0 && (
                          <Badge variant="default" className="text-xs min-w-[20px] h-5 px-1.5">
                            {t.unread > 99 ? "99+" : t.unread}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Last message preview */}
                    <div className="text-xs text-muted-foreground truncate">
                      {t.lastMessage ? (
                        <>
                          {t.lastMessage.sender?.username && t.type === "GROUP" && (
                            <span className="font-medium">
                              {t.lastMessage.sender.username}: 
                            </span>
                          )}
                          <span className="ml-1">
                            {t.lastMessage.content || 
                             (t.lastMessage.type === "IMAGE" ? "📷 Photo" :
                              t.lastMessage.type === "VIDEO" ? "🎥 Video" :
                              t.lastMessage.type === "FILE" ? "📎 File" : 
                              "Message")}
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
        /* Empty State */
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
    </div>
  );
}