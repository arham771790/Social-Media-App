"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dayjs from "dayjs";

export default function MessageList({ items, meId }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {items.map((msg) => {
        const isMe = msg.senderId === meId;
        return (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${
              isMe ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={msg.sender?.avatar} />
              <AvatarFallback>
                {msg.sender?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={`rounded-lg px-3 py-2 max-w-xs ${
                isMe
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {msg.type === "TEXT" && <p>{msg.content}</p>}
              {msg.type === "IMAGE" && (
                <img
                  src={msg.url}
                  alt="sent"
                  className="max-w-[200px] rounded"
                />
              )}
              {msg.type === "VIDEO" && (
                <video
                  src={msg.url}
                  controls
                  className="max-w-[200px] rounded"
                />
              )}
              <div className="text-[10px] opacity-70 mt-1">
                {dayjs(msg.createdAt).format("HH:mm")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
