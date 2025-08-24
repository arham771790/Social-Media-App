"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ConversationList from "@/components/messages/ConversationList";
import ChatHeader from "@/components/messages/ChatHeader";
import MessageList from "@/components/messages/MessageList";
import Composer from "@/components/messages/Composer";
import NewMessageDialog from "@/components/messages/dialogs/NewMessageDialog";

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
    totalUnread,
    isLoading,
    error,
  } = useChatStore();

  const [activeId, setActiveId] = useState(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
  );
  const [newOpen, setNewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    bindSocket(ioClient, token);
    fetchThreads().then((ts) => {
      if (!ts?.length) setNewOpen(true);
      if (!activeId && ts?.length) setActiveId(ts[0].id);
    });
  }, [token]); // eslint-disable-line

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId).then(() => markRead(activeId)).catch(() => {});
    joinRoom(activeId);
  }, [activeId]); // eslint-disable-line

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );
  
  const msgs = messagesByGroup[activeId]?.items || [];

  return (
    <>
      {/* min-h-0 here lets children own the scrolling */}
      <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[20rem_1fr] border rounded-lg overflow-hidden min-h-0">
        <ConversationList
          threads={threads}
          activeId={activeId}
          onPick={setActiveId}
          onNew={() => setNewOpen(true)}
        />

        {/* make this column a flex + min-h-0 so MessageList can scroll */}
        <div className="flex flex-col min-h-0">
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

      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleNewChatCreated}
      />
    </>
  );
}