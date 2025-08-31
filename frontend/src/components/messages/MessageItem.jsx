"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export default function MessageItem({ message, meId }) {
  const isMine = message.senderId === meId;

  return (
    <div
      className={cn(
        "flex mb-2",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-xs p-3 rounded-2xl shadow",
          isMine ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {/* ✅ Show text if available */}
        {message.text && <p className="whitespace-pre-wrap">{message.text}</p>}

        {/* ✅ Show image if mediaUrl exists */}
        {message.mediaUrl && message.mediaUrl.endsWith(".jpg") || message.mediaUrl.endsWith(".png") || message.mediaUrl.endsWith(".jpeg") ? (
          <div className="mt-2 rounded-lg overflow-hidden">
            <Image
              src={message.mediaUrl}
              alt="attachment"
              width={300}
              height={200}
              className="rounded-lg object-cover"
            />
          </div>
        ) : null}

        {/* ✅ Show video if mediaUrl is mp4/mov */}
        {message.mediaUrl && (message.mediaUrl.endsWith(".mp4") || message.mediaUrl.endsWith(".mov")) ? (
          <div className="mt-2 rounded-lg overflow-hidden">
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg max-h-64"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
