// src/components/messages/ChatContainer.jsx
"use client";

import { useEffect, useRef } from "react";
import MessageList from "./MessageList";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatContainer({
  thread,
  items = [],
  meId,
  loading = false,
  bottomPaddingClass = "pb-24 md:pb-28",
}) {
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);

  // Scroll to bottom on mount and when new messages arrive
  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.id, items?.length]);

  if (!thread) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-background text-muted-foreground">
        No conversation selected
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={`flex-1 overflow-y-auto bg-background px-3 sm:px-4 ${bottomPaddingClass}`}
    >
      {/* Loading state (messages skeletons) */}
      {loading && !items?.length ? (
        <div className="py-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-3">
          <MessageList messages={items} meId={meId} />
          {/* Spacer ensures last bubble never hides behind composer */}
          <div className="h-2" />
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
