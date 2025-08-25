"use client";
import { useState } from "react";
import { useChatStore } from "@/store/messageStore";

export default function MessageInput() {
  const [text, setText] = useState("");
  const { selectedChat, sendMessage } = useChatStore();

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(selectedChat, text);
      setText("");
    }
  };

  return (
    <div className="flex p-2 border-t border-gray-700">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 bg-gray-900 p-2 rounded text-white"
      />
      <button
        onClick={handleSend}
        className="ml-2 px-4 py-2 bg-blue-600 rounded"
      >
        Send
      </button>
    </div>
  );
}
