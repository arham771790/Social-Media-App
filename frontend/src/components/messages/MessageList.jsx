"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { useMessageStore } from "@/store/messageStore";

export default function MessageList({ items = [], meId }) {
  const listRef = useRef(null);
  const typingByGroup = useMessageStore((s) => s.typingByGroup);
  const activeChatId = useMessageStore((s) => s.activeChatId);
   const toBottom = () => {
   const el = listRef.current;
   if (!el) return;
   el.scrollTop = el.scrollHeight;
  };

  // On first mount (new chat because ChatContainer is keyed) -> snap to bottom
  useLayoutEffect(() => {
    toBottom();
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    // If user is near bottom, keep them pinned; else do not jump on incoming
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) toBottom();
  }, [items]);

  const typers = Object.values(typingByGroup[activeChatId] || {}).slice(0, 3);
  const typingLabel =
    typers.length === 1
      ? `${typers[0]} is typing…`
      : typers.length === 2
      ? `${typers[0]} and ${typers[1]} are typing…`
      : typers.length >= 3
      ? `${typers[0]}, ${typers[1]} and ${typers.length - 2} more are typing…`
      : "";

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-background bw-scroll" ref={listRef}>
      <ul className="space-y-2">
        {items.map((m) => {
          const mine = String(m?.sender?.id) === String(meId);
          return (
            <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-md px-3 py-2 text-sm shadow-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {/* content */}
                {m.mediaUrl ? (
                  /\.(mp4|mov|mkv|webm)$/i.test(m.mediaUrl) ? (
                    <video
                      src={m.mediaUrl}
                      className="rounded mb-1 max-h-64"
                      controls
                      playsInline
                    />
                  ) : (
                    <img src={m.mediaUrl} alt="attachment" className="rounded mb-1 max-h-64" />
                  )
                ) : null}
                {m.content ? <div className="whitespace-pre-wrap break-words">{m.content}</div> : null}

                {/* meta */}
                <div className={`mt-1 text-[11px] ${mine ? "opacity-85" : "text-muted-foreground"}`}>
                  {m.sender?.username ? `@${m.sender.username} · ` : ""}
                  {formatDistanceToNow(new Date(m.createdAt || m.timestamp || Date.now()), {
                    addSuffix: false,
                  })}
                  {mine && (
                    <>
                      {" · "}
                      {Array.isArray(m.readBy) && m.readBy.length > 1 ? "Read" : "Sent"}
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      
    </div>
  );
}
