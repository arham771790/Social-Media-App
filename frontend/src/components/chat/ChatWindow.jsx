"use client";
import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatWindow() {
  const { messages, selectedChat, fetchMessages, subscribeToMessages } =
    useChatStore();

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
      subscribeToMessages();
    }
  }, [selectedChat]);

  if (!selectedChat)
    return <div className="flex-1 flex items-center justify-center">Select a chat</div>;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="p-2 rounded bg-gray-800">
            <strong>{msg.sender.username}: </strong>
            {msg.content}
          </div>
        ))}
      </div>
    </div>
  );
}