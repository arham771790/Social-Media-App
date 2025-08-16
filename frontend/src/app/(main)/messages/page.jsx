// src/app/messages/page.jsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { io as ioClient } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ConversationList from "@/components/messages/ConversationList";
import ChatHeader from "@/components/messages/ChatHeader";
import MessageList from "@/components/messages/MessageList";
import Composer from "@/components/messages/Composer";
import NewMessageDialog from "@/components/messages/dialogs/NewMessageDialog"; // ⬅️ import

export default function MessagesPage() {
  const { token, user } = useAuthStore();
  const {
    bindSocket,
    fetchThreads,
    fetchMessages,
    threads,
    messagesByGroup,
    joinRoom,
    markRead,
  } = useChatStore();

  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false); // ⬅️ control dialog

  useEffect(() => {
    if (!token) return;
    bindSocket(ioClient, token);
    fetchThreads().then((ts) => {
      // if no threads at all, auto-open the dialog once
      if (!ts?.length) setNewOpen(true);
      if (!activeId && ts?.length) setActiveId(ts[0].id);
    });
  }, [token]);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId).then(() => markRead(activeId)).catch(() => {});
    joinRoom(activeId);
  }, [activeId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );
  const msgs = messagesByGroup[activeId]?.items || [];

  return (
    <>
      <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[20rem_1fr] border rounded-lg overflow-hidden">
        <ConversationList
          threads={threads}
          activeId={activeId}
          onPick={setActiveId}
          onNew={() => setNewOpen(true)}        // ⬅️ open dialog
        />
        <div className="flex flex-col">
          <ChatHeader thread={activeThread} />
          {activeId ? (
            <>
              <MessageList items={msgs} meId={user?.id} />
              <Composer chatGroupId={activeId} />
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              Select a chat
            </div>
          )}
        </div>
      </div>

      {/* New chat dialog */}
      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(chatId) => {
          setActiveId(chatId);
          setNewOpen(false);
        }}
      />
    </>
  );
}
