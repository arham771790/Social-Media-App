// src/components/messages/ConversationList.jsx
"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function ConversationList({ threads, activeId, onPick, onNew }) {
  const hasThreads = threads?.length > 0;

  return (
    <aside className="w-full md:w-80 border-r border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Chats</div>
        <Button size="sm" variant="secondary" onClick={onNew}>New</Button>
      </div>

      {hasThreads ? (
        <ul className="divide-y divide-border">
          {threads.map((t) => {
            const name = t.name || "Unknown";
            return (
              <li
                key={t.id}
                onClick={() => onPick(t.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted ${
                  activeId === t.id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="w-9 h-9">
                  <AvatarImage src={t.avatar || undefined} />
                  <AvatarFallback>{name[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{name}</span>
                    {t.unread ? (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs px-1">
                        {t.unread}
                      </span>
                    ) : null}
                  </div>
                  {t.lastMessage ? (
                    <div className="text-xs text-muted-foreground truncate">
                      {t.lastMessage.sender?.username
                        ? `${t.lastMessage.sender.username}: `
                        : ""}
                      {t.lastMessage.content || t.lastMessage.type}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">No messages yet</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-10 text-sm text-muted-foreground">
          <p className="mb-3">You don’t have any chats yet.</p>
          <Button size="sm" onClick={onNew}>Start a conversation</Button>
        </div>
      )}
    </aside>
  );
}
