"use client";
import { useEffect } from "react";
import { useChatStore } from "@/store/messageStore";

export default function ChatList({ onSelectChat }) {
  const { conversations, fetchConversations, loading } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div className="w-64 border-r border-gray-700">
      <h2 className="p-4 font-bold">Chats</h2>
      <ul>
        {conversations.map((chat) => (
          <li
            key={chat.id}
            className="p-4 hover:bg-gray-800 cursor-pointer"
            onClick={() => onSelectChat(chat.id)}
          >
            {chat.name || chat.participants?.map((u) => u.username).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
