"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TypingBar({ users = [] }) {
  if (!users.length) return null;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((u) => (
          <Avatar key={u.id} className="h-6 w-6 ring-2 ring-background">
            <AvatarImage src={u.avatar || undefined} />
            <AvatarFallback>{u.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <motion.div
        className="flex items-center gap-1 text-xs text-muted-foreground"
        initial="rest"
        animate="typing"
        variants={{
          typing: { transition: { staggerChildren: 0.2 } },
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
            variants={{
              typing: { y: [0, -3, 0], opacity: [0.5, 1, 0.5], transition: { duration: 0.8, repeat: Infinity } },
            }}
          />
        ))}
        <span className="ml-1">typing…</span>
      </motion.div>
    </div>
  );
}
