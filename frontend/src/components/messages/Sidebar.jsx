"use client";
import { useState } from "react";
import { useChatStore } from "@/store/messageStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import NewMessageDialog from "./dialogs/NewMessageDialog";

export default function Sidebar({ onSelect }) {
  const { threads, totalUnread, setActiveChat } = useChatStore();
  const [open, setOpen] = useState(false);

  return (
    <aside className="w-full md:w-80 border-r border-border flex flex-col h-full bg-background">
      <div className="p-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold flex-1">Chats</h2>
        {!!totalUnread && (
          <span className="text-xs rounded-full bg-blue-600 text-white px-2 py-0.5">{totalUnread}</span>
        )}
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>New</Button>
      </div>
      <Separator />
      <ul className="flex-1 overflow-y-auto">
        {threads.map((t) => (
          <li
            key={t.id}
            className="px-3 py-2 hover:bg-muted/60 cursor-pointer"
            onClick={() => { setActiveChat(t.id); onSelect?.(); }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={t.avatar || undefined} />
                <AvatarFallback>{(t.name || "?")[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{t.name}</div>
                  {t.unread ? (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs px-1">
                      {t.unread}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.lastMessage
                    ? `${t.lastMessage.sender?.username ? `${t.lastMessage.sender.username}: ` : ""}${t.lastMessage.content || t.lastMessage.type}`
                    : "No messages yet"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <NewMessageDialog open={open} onOpenChange={setOpen} />
    </aside>
  );
}
