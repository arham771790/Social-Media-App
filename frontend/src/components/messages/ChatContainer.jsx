"use client";

import { useEffect, useRef } from "react";
import MessageList from "./MessageList";

export default function ChatContainer({ thread, items = [], meId }) {
  const bottomRef = useRef(null);

  

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-background">
      {thread ? (
        <>
          <MessageList messages={items} meId={meId} />
          <div ref={bottomRef} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No conversation selected
        </div>
      )}
    </div>
  );
}
