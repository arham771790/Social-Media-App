"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useMessageStore } from "@/store/messageStore";

export default function MessageList({ messages = [], meId, chatGroupId }) {
  const typingByGroup = useMessageStore((s) => s.typingByGroup);

  // get all usernames except myself
  const typingUsers = Object.entries(typingByGroup[chatGroupId] || {})
    .filter(([userId]) => String(userId) !== String(meId))
    .map(([_, username]) => username);

  return (
    <div className="space-y-4">
      {Array.from(new Map(messages.map(m => [m.id, m])).values()).map((msg) => {
        const isMe = String(msg.sender?.id) === String(meId);
        const hasMedia = Boolean(msg.mediaUrl);

        let mediaEl = null;
        if (hasMedia) {
          if (msg.mediaType?.startsWith("image/")) {
            mediaEl = (
              <div className="relative w-[250px] h-[250px] cursor-pointer">
                <Image
                  src={msg.mediaUrl}
                  alt="attachment"
                  fill
                  className="rounded-xl object-cover"
                  onClick={() => window.open(msg.mediaUrl, "_blank")}
                />
              </div>
            );
          } else if (msg.mediaType?.startsWith("video/")) {
            mediaEl = (
              <video
                src={msg.mediaUrl}
                controls
                className="rounded-xl max-w-[300px] max-h-[200px]"
              />
            );
          } else if (msg.mediaType?.startsWith("audio/")) {
            mediaEl = (
              <audio
                src={msg.mediaUrl}
                controls
                className="w-48"
              />
            );
          } else {
            mediaEl = (
              <a
                href={msg.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
              >
                📎 Attachment
              </a>
            );
          }
        }

        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${isMe ? "justify-end" : "justify-start"}`}
          >
            {!isMe && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={msg.sender?.avatar} />
                <AvatarFallback>
                  {msg.sender?.username?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-xs px-3 py-2 rounded-2xl text-sm shadow break-words ${
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-none"
                  : "bg-muted rounded-bl-none"
              }`}
            >
              {msg.content && <div>{msg.content}</div>}
              {mediaEl && <div className="mt-1">{mediaEl}</div>}
              <div className="text-[10px] text-muted-foreground mt-1 text-right">
                {format(new Date(msg.createdAt), "HH:mm")}
              </div>
            </div>
          </div>
        );
      })}

      {/* 🔥 Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 text-amber-700 text-sm text-muted-foreground pl-10">
          <div className="bg-muted px-3 py-1 rounded-2xl animate-pulse">
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing…
          </div>
        </div>
      )}
    </div>
  );
}
