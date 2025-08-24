// src/components/messages/MessageList.jsx
"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import dayjs from "dayjs";
import { shallow } from "zustand/shallow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TypingBar from "./TypingBar";
import { useChatStore } from "@/store/chatStore";

export default function MessageList({ items, meId, className = "", chatGroupId, isLoading }) {
  const endRef = useRef(null);

  const typingSelector = useCallback(
    (s) => s.messagesByGroup[chatGroupId]?.typing,
    [chatGroupId]
  );
  const typing = useChatStore(typingSelector, shallow) || [];

  const sorted = useMemo(
    () => items.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [items]
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sorted.length]);

  if (isLoading) {
    return (
      <div className={`space-y-3 p-3 sm:p-4 ${className}`}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full skeleton" />
            <div className="space-y-2">
              <div className="h-4 w-56 sm:w-72 skeleton" />
              <div className="h-3 w-40 skeleton" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 sm:space-y-3 p-3 sm:p-4 ${className}`}>
      {sorted.map((msg) => {
        const isMe = msg.senderId === meId || msg.sender?.id === meId;
        return (
          <div key={msg.id} className={`flex items-start gap-2 sm:gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
              <AvatarImage src={msg.sender?.avatar || undefined} />
              <AvatarFallback>{msg.sender?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>

            <div
              className={[
                "rounded-lg px-3 py-2",
                "max-w-[86%] sm:max-w-[78%] md:max-w-[70%]",
                isMe ? "bg-blue-600 text-white" : "bg-muted text-foreground",
              ].join(" ")}
            >
              {msg.type === "TEXT" && (
                <p className="whitespace-pre-wrap break-words text-sm sm:text-[15px] leading-5">
                  {msg.content}
                </p>
              )}

              {msg.type === "IMAGE" && (
                <img
                  src={msg.mediaUrl || msg.url}
                  alt="sent"
                  className="w-full max-w-[260px] sm:max-w-[360px] md:max-w-[420px] rounded"
                />
              )}

              {msg.type === "VIDEO" && (
                <video
                  src={msg.mediaUrl || msg.url}
                  controls
                  className="w-full max-w-[260px] sm:max-w-[360px] md:max-w-[420px] rounded"
                />
              )}

              {msg.type === "FILE" && (
                <a
                  href={msg.mediaUrl || msg.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline break-all text-sm"
                >
                  Download file
                </a>
              )}

              <div className="text-[10px] opacity-70 mt-1">
                {dayjs(msg.createdAt).format("MMM D, YYYY • HH:mm")}
              </div>
            </div>
          </div>
        );
      })}

      {!!typing.length && <TypingBar users={typing} />}
      <div ref={endRef} />
    </div>
  );
}
