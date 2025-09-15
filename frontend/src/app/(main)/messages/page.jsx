// src/app/messages/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, Users, ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import ConversationList from "@/components/messages/ConversationList";
import ChatHeader from "@/components/messages/ChatHeader";
import ChatContainer from "@/components/messages/ChatContainer";
import Composer from "@/components/messages/Composer";
import NewMessageDialog from "@/components/messages/dialogs/NewMessageDialog";
import NewGroupDialog from "@/components/messages/dialogs/NewGroupDialog";
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
  const [groupOpen, setGroupOpen] = useState(false); // ✅ new group dialog state
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const [infoOpen, setInfoOpen] = useState(false);

  // Initial data
  useEffect(() => {
    if (!token) return;
    bindSocket();
    fetchThreads().then((ts) => {
      if (!ts?.length) setNewOpen(true);
      if (!activeId && ts?.length) setActiveId(ts[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeId) return;
    fetchMessages(activeId).then(() => markAsRead(activeId)).catch(() => {});
    joinRoom(activeId);
    refreshPresence(activeId);
    localStorage.setItem(ACTIVE_KEY, activeId);

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false); // auto-close drawer on mobile
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
    setGroupOpen(false);
  };

  return (
    <>
      {/* Shell */}
      <div className="relative h-[calc(100dvh-64px)] max-w-6xl mx-auto border border-border/50 md:rounded-xl md:overflow-hidden min-h-0 grid md:grid-cols-[20rem_1fr] shadow-lg bg-background [padding-bottom:env(safe-area-inset-bottom)]">
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
          {/* Mobile list header: SHOW only when no active chat on mobile */}
          <div className="md:hidden">
            {!activeId && (
              <div className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                <div className="h-12 px-3 flex items-center justify-between">
                  <button
                    onClick={() => (window.location.href = "/feed")}
                    className="inline-flex items-center gap-2 text-gray-200 hover:text-white"
                    aria-label="Back to feed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="text-base font-medium">Back</span>
                  </button>
                  <h2 className="text-lg font-semibold">Messages</h2>
                  <div className="flex items-center gap-2">
                    {/* New message button */}
                    <button
                      onClick={() => setNewOpen(true)}
                      className="p-2 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90"
                      aria-label="New message"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                    </button>
                    {/* ✅ New group button opens NewGroupDialog */}
                    <button
                      onClick={() => setGroupOpen(true)}
                      className="p-2 rounded-full border border-border/60 hover:bg-muted/30"
                      aria-label="New group"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* When no chat selected – show conversation list (mobile) */}
          <div className="md:hidden flex-1 min-h-0">
            {!activeId && (
              <ConversationList
                threads={threads}
                activeId={activeId}
                onPick={(id) => setActiveId(id)}
                onNew={() => setNewOpen(true)}
                totalUnread={totalUnread}
                isLoading={loadingThreads}
              />
            )}
          </div>

          {/* When a chat is selected */}
          {activeId && (
            <>
              {/* Chat header (has its own Back to list) */}
              <div className="sticky top-0 z-20">
                <ChatHeader
                  thread={activeThread}
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  onBack={() => setActiveId(null)} // back to list on mobile
                  showBackOnMobile
                  hasActive={!!activeId}
                  onToggleInfo={() => setInfoOpen(true)}
                />
              </div>

              <ChatContainer
                key={activeId}
                thread={activeThread}
                items={msgs}
                meId={user?.id}
                loading={isLoadingMsgs}
                bottomPaddingClass="pb-24 md:pb-28 [padding-bottom:env(safe-area-inset-bottom)]"
              />

              {/* Sticky composer footer */}
              <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 [padding-bottom:env(safe-area-inset-bottom)]">
                <Composer chatGroupId={activeId} />
              </div>
            </>
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

      {/* ✅ New group dialog */}
      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
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
