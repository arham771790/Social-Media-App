// src/components/messages/ConversationList.jsx
"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import NewGroupDialog from "@/components/messages/dialogs/NewGroupDialog";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";

export default function ConversationList({ threads, activeId, onPick, onNew }) {
  const [groupOpen, setGroupOpen] = useState(false);
  const me = useAuthStore((s) => s.user);
  const onlineIds = useChatStore((s) => s.onlineUserIds);
  const hasThreads = threads?.length > 0;

  const isThreadOnline = (t) => {
    const myId = String(me?.id || "");
    const members = t?.members || [];
    if (t?.type === "DIRECT") {
      const other = members.find((m) => String(m.id) !== myId);
      return other ? onlineIds.has(String(other.id)) : false;
    }
    // GROUP: any member except me is online
    return members.some((m) => String(m.id) !== myId && onlineIds.has(String(m.id)));
  };

  return (
    <aside className="w-full md:w-80 border-r border-border min-h-0 flex flex-col">
      <div className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2 bg-background/75 backdrop-blur sticky top-0 z-10 border-b md:border-b-0">
        <div className="text-base md:text-lg font-semibold">Chats</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="h-8 px-2 md:px-3" onClick={onNew}>
            New
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-2 md:px-3"
            onClick={() => setGroupOpen(true)}
          >
            Group
          </Button>
        </div>
      </div>

      {hasThreads ? (
        <ul className="divide-y divide-border overflow-y-auto flex-1 min-h-0">
          {threads.map((t) => {
            const name = t.name || "Unknown";
            const online = isThreadOnline(t);
            return (
              <li
                key={t.id}
                onClick={() => onPick(t.id)}
                className={`flex items-center gap-3 px-3 py-2 md:px-4 md:py-3 cursor-pointer hover:bg-muted/60 ${
                  activeId === t.id ? "bg-muted/70" : ""
                }`}
              >
                <div className="relative">
                  <Avatar className="w-8 h-8 md:w-9 md:h-9 shrink-0">
                    <AvatarImage src={t.avatar || undefined} />
                    <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {online && (
                    <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{name}</span>
                    {t.unread ? (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs px-1">
                        {t.unread}
                      </span>
                    ) : null}
                  </div>

                  {t.lastMessage ? (
                    <div className="text-[11px] md:text-xs text-muted-foreground truncate">
                      {t.lastMessage.sender?.username ? `${t.lastMessage.sender.username}: ` : ""}
                      {t.lastMessage.content || t.lastMessage.type}
                    </div>
                  ) : (
                    <div className="text-[11px] md:text-xs text-muted-foreground italic">No messages yet</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-8 text-sm text-muted-foreground">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 md:w-32 skeleton" />
                  <div className="h-2 w-40 md:w-48 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={(id) => {
          setGroupOpen(false);
          onPick?.(id);
        }}
      />
    </aside>
  );
}
