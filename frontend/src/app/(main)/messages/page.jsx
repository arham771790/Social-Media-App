// src/app/messages/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import ConversationList from "@/components/messages/ConversationList";
import ChatHeader from "@/components/messages/ChatHeader";
import ChatContainer from "@/components/messages/ChatContainer";
import Composer from "@/components/messages/Composer";
import NewMessageDialog from "@/components/messages/dialogs/NewMessageDialog";

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
    markAsRead,
    totalUnread,
    loadingThreads,
    refreshPresence,
  } = useMessageStore();

  const [activeId, setActiveId] = useState(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
  );
  const [newOpen, setNewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!token) return;
    bindSocket();
    fetchThreads().then((ts) => {
      if (!ts?.length) setNewOpen(true);
      if (!activeId && ts?.length) setActiveId(ts[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId).then(() => markAsRead(activeId)).catch(() => {});
    joinRoom(activeId);
    refreshPresence(activeId);
    localStorage.setItem(ACTIVE_KEY, activeId);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );
  const msgs = messagesByGroup[activeId] || [];

  const handleNewChatCreated = (id) => {
    if (!id) return;
    setActiveId(id);
    setNewOpen(false);
  };

  return (
    <>
      <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto border border-border/50 rounded-xl overflow-hidden min-h-0 grid md:grid-cols-[20rem_1fr] shadow-lg">
        {/* Sidebar (List) */}
        <div
          className={[
            "bg-card/95 backdrop-blur-sm border-r border-border/50 md:static md:translate-x-0 md:block shadow-lg",
            "fixed inset-y-0 left-0 w-[85%] max-w-xs z-30 transition-all duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <ConversationList
            threads={threads}
            activeId={activeId}
            onPick={(id) => setActiveId(id)}
            onNew={() => setNewOpen(true)}
            totalUnread={totalUnread}
            isLoading={loadingThreads}
          />
        </div>

        {/* Overlay for mobile drawer */}
        <div
          className={[
            "fixed inset-0 bg-black/40 z-20 md:hidden",
            sidebarOpen ? "block" : "hidden",
          ].join(" ")}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Chat pane */}
        <div className="flex flex-col min-h-0 bg-background/95 backdrop-blur-sm">
          <ChatHeader
            thread={activeThread}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onBack={() => setSidebarOpen(true)}
            showBackOnMobile
            hasActive={!!activeId}
          />
          {activeId ? (
            <>
              <ChatContainer key={activeId} thread={activeThread} items={msgs} meId={user?.id} />
              <Composer chatGroupId={activeId} />
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <MessageSquarePlus className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Select a chat</h3>
                <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
              </div>
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
