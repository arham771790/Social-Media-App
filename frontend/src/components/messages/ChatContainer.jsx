// src/components/messages/ChatContainer.jsx
"use client";

import { motion } from "framer-motion";

export default function ChatContainer({ header, list, composer }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {header}
      </div>

      <motion.div
        key="chat-scroll"
        className="
          chat-messages flex-1 overflow-y-auto overscroll-contain scroll-smooth
          px-2 sm:px-4 py-2 sm:py-3
          pb-24 sm:pb-28
        "
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarGutter: "stable both-edges",
        }}
      >
        {list}
      </motion.div>

      <div
        className="
          chat-composer sticky bottom-0 z-30 border-t bg-background/95
          backdrop-blur supports-[backdrop-filter]:bg-background/80
          px-2 sm:px-3
        "
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {composer}
      </div>
    </div>
  );
}
