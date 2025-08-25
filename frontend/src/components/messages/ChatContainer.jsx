"use client";

import { useMemo } from "react";
import MessageList from "./MessageList";
import { useMessageStore } from "@/store/messageStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * thread: pass the active thread (so we can map typer names -> avatars)
 * items, meId: same as MessageList
 */
export default function ChatContainer({ thread, items = [], meId }) {
  const typingByGroup = useMessageStore((s) => s.typingByGroup);
  const activeChatId = useMessageStore((s) => s.activeChatId);

  const typersMap = typingByGroup[activeChatId] || {};
  // typersMap is expected like { userId: username } OR { username: true } depending on your store.
  // We'll normalize to an array of { id, username } using thread members.

  const typers = useMemo(() => {
    if (!thread) return [];
    const members = Array.isArray(thread.members) ? thread.members : [];
    const entries = Object.entries(typersMap);

    // Find by either id or username match
    const resolveTyper = (key, val) => {
      // if key is userId
      let m = members.find((mb) => String(mb.id) === String(key));
      if (m) return m;
      // try username
      m = members.find((mb) => (mb.username || "").toLowerCase() === String(key).toLowerCase());
      if (m) return m;
      // try val as username if val is string
      if (typeof val === "string") {
        m = members.find((mb) => (mb.username || "").toLowerCase() === val.toLowerCase());
        if (m) return m;
      }
      // fallback minimal object
      return { id: key, username: typeof val === "string" ? val : key };
    };

    const arr = entries
      .map(([k, v]) => resolveTyper(k, v))
      // exclude self
      .filter((m) => String(m.id) !== String(meId));

    // unique by id/username and max 3
    const seen = new Set();
    const unique = [];
    for (const m of arr) {
      const sig = String(m.id || m.username);
      if (!seen.has(sig)) {
        seen.add(sig);
        unique.push(m);
      }
      if (unique.length >= 3) break;
    }
    return unique;
  }, [thread, typersMap, meId]);

  return (
    <div className="flex-1 overflow-y-auto bg-background bw-scroll flex flex-col">
      <MessageList items={items} meId={meId} />

      {/* Typing indicators */}
      {typers.length > 0 && (
        <div className="px-3 pb-3 flex items-end gap-2">
          {/* Avatars cluster */}
          <div className="flex -space-x-2">
            {typers.map((t) => (
              <Avatar key={t.id || t.username} className="h-6 w-6 ring-2 ring-background">
                <AvatarImage src={t.avatar || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(t.username?.[0] || t.name?.[0] || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {/* Bubble with animated dots */}
          <TypingDotsBubble names={typers.map((t) => t.username || t.name || "Someone")} />
        </div>
      )}
    </div>
  );
}

function TypingDotsBubble({ names = [] }) {
  const label =
    names.length === 1
      ? `${names[0]} is typing…`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing…`
      : `${names[0]}, ${names[1]} and ${names.length - 2} more are typing…`;

  return (
    <div
      className="bg-muted rounded-2xl px-3 py-2 shadow-sm flex items-center gap-2"
      title={label}
      aria-label={label}
      role="status"
    >
      {/* Animated dots (pure Tailwind) */}
      <span className="inline-flex items-center gap-1">
        <Dot className="animate-bounce" />
        <Dot className="animate-bounce [animation-delay:150ms]" />
        <Dot className="animate-bounce [animation-delay:300ms]" />
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}

function Dot({ className = "" }) {
  return <span className={`w-2 h-2 rounded-full bg-muted-foreground/80 ${className}`} />;
}
