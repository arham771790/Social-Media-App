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
import InfoDialog from "@/components/messages/dialogs/InfoDialog";

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
    loadingMessagesByGroup,
  } = useMessageStore();

  const [activeId, setActiveId] = useState(
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null
  );
  const [newOpen, setNewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // closed by default on mobile
  const [infoOpen, setInfoOpen] = useState(false);

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
      setSidebarOpen(false); // auto-close drawer after pick on mobile
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );

  const msgs = messagesByGroup[activeId] || [];
  const isLoadingMsgs = !!loadingMessagesByGroup?.[activeId];

  const handleNewChatCreated = (id) => {
    if (!id) return;
    setActiveId(id);
    setNewOpen(false);
  };

  return (
    <>
      {/* 
        Shell uses dvh so mobile browser chrome doesn’t hide the footer.
        Rounded & bordered on desktop, edge-to-edge on mobile.
      */}
      <div className="relative h-[calc(100dvh-64px)] md:h-[calc(100dvh-64px)] max-w-6xl mx-auto border border-border/50 md:rounded-xl md:overflow-hidden min-h-0 grid md:grid-cols-[20rem_1fr] shadow-lg bg-background">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block bg-card/95 backdrop-blur-sm border-r border-border/50">
          <ConversationList
            threads={threads}
            activeId={activeId}
            onPick={(id) => setActiveId(id)}
            onNew={() => setNewOpen(true)}
            totalUnread={totalUnread}
            isLoading={loadingThreads}
          />
        </aside>

        {/* Chat pane */}
        <section className="flex flex-col min-h-0">
          {/* Sticky header so actions are always accessible */}
          <div className="sticky top-0 z-20">
            <ChatHeader
              thread={activeThread}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
              onBack={() => setSidebarOpen(true)}
              showBackOnMobile
              hasActive={!!activeId}
              onToggleInfo={() => setInfoOpen(true)}
            />
          </div>

          {activeId ? (
            <>
              {/* Messages scroll area with bottom padding so Composer never overlaps */}
              <ChatContainer
                key={activeId}
                thread={activeThread}
                items={msgs}
                meId={user?.id}
                loading={isLoadingMsgs}
                // reserve space for composer (mobile/touch)
                bottomPaddingClass="pb-24 md:pb-28 [padding-bottom:env(safe-area-inset-bottom)]"
              />

              {/* Sticky composer footer */}
              <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 [padding-bottom:env(safe-area-inset-bottom)]">
                <Composer chatGroupId={activeId} />
              </div>
            </>
          ) : (
            // Empty (no chat selected)
            <div className="flex-1 grid place-items-center text-muted-foreground px-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <MessageSquarePlus className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Select a chat</h3>
                <p className="text-sm">
                  Choose a conversation from the sidebar to start messaging
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted"
                  onClick={() => setNewOpen(true)}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  New message
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={[
          "fixed inset-0 bg-black/40 z-40 md:hidden",
          sidebarOpen ? "block" : "hidden",
        ].join(" ")}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Mobile sidebar drawer */}
      <div
        className={[
          "fixed inset-y-0 left-0 w-[85%] max-w-xs z-50 md:hidden transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="h-full bg-card/95 backdrop-blur-sm border-r border-border/50 shadow-lg">
          <ConversationList
            threads={threads}
            activeId={activeId}
            onPick={(id) => setActiveId(id)}
            onNew={() => setNewOpen(true)}
            totalUnread={totalUnread}
            isLoading={loadingThreads}
          />
        </div>
      </div>

      {/* New message dialog */}
      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleNewChatCreated}
      />

      {/* Info dialog */}
      <InfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        thread={activeThread}
      />
    </>
  );
}
