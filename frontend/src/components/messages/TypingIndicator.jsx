"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TypingIndicator({ usernames = [] }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (usernames.length === 0) return;
    
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    
    return () => clearInterval(interval);
  }, [usernames.length]);

  if (usernames.length === 0) return null;

  const text = usernames.length === 1 
    ? `${usernames[0]} is typing${dots}`
    : usernames.length === 2
    ? `${usernames[0]} and ${usernames[1]} are typing${dots}`
    : `${usernames[0]} and ${usernames.length - 1} others are typing${dots}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="px-4 py-2 text-xs text-muted-foreground italic"
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}