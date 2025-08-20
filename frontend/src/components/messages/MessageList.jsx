// src/components/messages/MessageList.jsx
"use client";
import { useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dayjs from "dayjs";

export default function MessageList({ items, meId }) {
  const scrollerRef = useRef(null);

  // auto scroll to bottom when items change
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // keep tiny delay so DOM paints before we scroll
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [items]);

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 scroll-smooth"
    >
      {items.map((msg) => {
        const isMe = msg.senderId === meId;
        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={msg.sender?.avatar || undefined} />
              <AvatarFallback>
                {msg.sender?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div
              className={`rounded-lg px-3 py-2 max-w-[70%] ${
                isMe ? "bg-blue-600 text-white" : "bg-muted text-foreground"
              }`}
            >
              {msg.type === "TEXT" && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}

              {msg.type === "IMAGE" && (
                <img
                  src={msg.url || msg.mediaUrl}
                  alt="sent"
                  className="max-w-[220px] rounded"
                />
              )}

              {msg.type === "VIDEO" && (
                <video
                  src={msg.url || msg.mediaUrl}
                  controls
                  className="max-w-[220px] rounded"
                />
              )}

              <div className={`text-[10px] opacity-70 mt-1 ${isMe ? "text-white/80" : "text-muted-foreground"}`}>
                {dayjs(msg.createdAt).format("MMM D, YYYY · HH:mm")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
  