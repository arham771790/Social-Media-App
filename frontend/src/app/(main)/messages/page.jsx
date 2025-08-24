// src/app/messages/page.jsx
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
import ChatContainer from "@/components/messages/ChatContainer";
import IncomingCallToast from "@/components/messages/call/IncomingCallToast";

const ACTIVE_KEY = "activeChatId";

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

  const [activeId, setActiveId] = useState(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
  );
  const [newOpen, setNewOpen] = useState(false);

  // once per token
  useEffect(() => {
    if (!token) return;
    bindSocket(token);
    fetchThreads().then((ts) => {
      if (!ts?.length) setNewOpen(true);
      if (!activeId && ts?.length) setActiveId(ts[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // switch chat
  useEffect(() => {
    if (!activeId) return;
    if (typeof window !== "undefined") localStorage.setItem(ACTIVE_KEY, activeId);
    fetchMessages(activeId).then(() => markRead(activeId)).catch(() => {});
    joinRoom(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );
  const msgs = messagesByGroup[activeId]?.items || [];
  const isMsgLoading = !!messagesByGroup[activeId]?.isLoading;

  const showListMobile = !activeId;
  const showChatMobile = !!activeId;

  return (
    <>
      <div
        className="
          h-[calc(100svh-64px)] md:h-[calc(100dvh-64px)]
          max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[20rem_1fr]
          border rounded-lg overflow-hidden min-h-0
        "
      >
        {/* List */}
        <div className={`${showListMobile ? "block" : "hidden"} md:block`}>
          <ConversationList
            threads={threads}
            activeId={activeId}
            onPick={(id) => setActiveId(id)}
            onNew={() => setNewOpen(true)}
          />
        </div>

        {/* Chat */}
        <div className={`${showChatMobile ? "flex" : "hidden"} md:flex flex-col min-h-0`}>
          {activeId && (
            <div className="md:hidden h-12 border-b border-border flex items-center gap-2 px-2 bg-background/60 backdrop-blur sticky top-0 z-20">
              <button
                className="p-2 rounded hover:bg-muted -ml-1"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="font-medium truncate">{activeThread?.name || "Chat"}</div>
            </div>
          )}

          <div className="hidden md:block">
            <ChatHeader thread={activeThread || null} />
          </div>

          {activeId ? (
            <ChatContainer
              header={null}
              list={
                <MessageList
                  items={msgs}
                  meId={user?.id}
                  chatGroupId={activeId}
                  isLoading={isMsgLoading}
                />
              }
              composer={<Composer chatGroupId={activeId} />}
            />
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
              Select a chat
            </div>
          )}
        </div>
      </div>

      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(chatId) => {
          setActiveId(chatId);
          setNewOpen(false);
        }}
      />

      {/* Global incoming call popup + ringtone */}
      <IncomingCallToast onAccept={(roomId) => setActiveId(roomId)} />
    </>
  );
}
