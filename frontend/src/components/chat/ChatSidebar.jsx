"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function ChatSidebar({ threads, activeChatId, setActiveChat, onNewChat }) {
  return (
    <>
      <div className="p-3 flex items-center gap-2">
        <h2 className="text-lg font-semibold flex-1">Chats</h2>
        <Button size="sm" variant="secondary" onClick={onNewChat}>
          New
        </Button>
      </div>
      <Separator />
      <ul className="overflow-y-auto h-[calc(100%-56px)]">
        {threads.map((t) => (
          <li
            key={t.id}
            onClick={() => setActiveChat(t.id)}
            className={`px-3 py-2 cursor-pointer hover:bg-muted/60 ${
              activeChatId === t.id ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={t.avatar || undefined} />
                <AvatarFallback>{(t.name || "?")[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{t.name}</div>
                  {t.unread && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs px-1">
                      {t.unread}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {t.lastMessage
                    ? `${t.lastMessage.sender?.username ? `${t.lastMessage.sender.username}: ` : ""}${
                        t.lastMessage.content || t.lastMessage.type
                      }`
                    : "No messages yet"}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
