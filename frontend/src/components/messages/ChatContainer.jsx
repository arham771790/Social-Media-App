// src/components/messages/ChatContainer.jsx
"use client";

import { useEffect, useRef } from "react";
import MessageList from "./MessageList";

export default function ChatContainer({
  thread,
  items = [],
  meId,
  loading = false,
  showSpinnerOverlay = false,
  // We no longer rely on bottom padding tricks for scroll containment.
  className = "",
}) {
  const bottomRef = useRef(null);
  const scrollAreaRef = useRef(null);

  // Always scroll to bottom when thread changes or new items arrive
  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.id, items?.length]);

  if (!thread) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
        No conversation selected
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col min-h-0 h-full ${className}`}>
      {/* Scroll area */}
      <div
        ref={scrollAreaRef}
        className="flex-1 min-h-0 overflow-y-auto bg-background px-3 sm:px-4 py-3"
      >
        {loading && !items?.length ? (
          <BubbleSkeleton />
        ) : (
          <>
            <MessageList messages={items} meId={meId} />
            {/* tiny spacer + anchor so the last bubble never hides behind the composer */}
            <div className="h-2" />
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Optional overlay spinner when loading additional messages */}
      {showSpinnerOverlay && loading && items?.length > 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" />
        </div>
      )}
    </div>
  );
}

function BubbleSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 10 }).map((_, i) => {
        const right = i % 2 === 0;
        return (
          <div key={i} className={`flex ${right ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                right ? "rounded-tr-md" : "rounded-tl-md"
              } bg-muted`}
              style={{ minHeight: 20 + (i % 3) * 10 }}
            />
          </div>
        );
      })}
    </div>
  );
}
