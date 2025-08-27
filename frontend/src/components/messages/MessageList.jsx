"use client";

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
      {messages.map((msg) => {
        const isMe = String(msg.sender?.id) === String(meId);
        const hasMedia = Boolean(msg.mediaUrl);

        let mediaEl = null;
        if (hasMedia) {
          if (msg.mediaUrl.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
            mediaEl = <img src={msg.mediaUrl} className="rounded max-w-[200px] max-h-[200px] object-cover" />;
          } else if (msg.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
            mediaEl = <video src={msg.mediaUrl} controls className="rounded max-w-[250px] max-h-[200px]" />;
          } else if (msg.mediaUrl.match(/\.(mp3|wav|ogg)$/i)) {
            mediaEl = <audio src={msg.mediaUrl} controls className="w-40" />;
          } else {
            mediaEl = (
              <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="underline">
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
        <div className="flex items-center gap-2  text-amber-700 text-sm text-muted-foreground pl-10">
          <div className="bg-muted px-3 py-1 rounded-2xl animate-pulse">
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing…
          </div>
        </div>
      )}
    </div>
  );
}
