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

  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const [threadError, setThreadError] = useState(false);
  const [msgError, setMsgError] = useState(false);

  // Initial data
  useEffect(() => {
    if (!token) return;
    bindSocket();
    setThreadError(false);
    fetchThreads()
      .then((ts) => {
        if (!ts?.length) setNewOpen(true);
        if (!activeId && ts?.length) setActiveId(ts[0].id);
      })
      .catch(() => setThreadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load messages for active thread
  useEffect(() => {
    if (!activeId) return;
    setMsgError(false);
    fetchMessages(activeId)
      .then(() => markAsRead(activeId))
      .catch(() => setMsgError(true));
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
          {loadingThreads ? (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-6 w-32 bg-gray-700 rounded" />
              <div className="h-6 w-40 bg-gray-700 rounded" />
              <div className="h-6 w-28 bg-gray-700 rounded" />
            </div>
          ) : threadError ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-400">Failed to load threads.</p>
              <button
                onClick={() => {
                  setThreadError(false);
                  fetchThreads();
                }}
                className="mt-2 px-3 py-1 bg-red-600 rounded text-white text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <ConversationList
              threads={threads}
              activeId={activeId}
              onPick={(id) => setActiveId(id)}
              onNew={() => setNewOpen(true)}
              totalUnread={totalUnread}
              isLoading={loadingThreads}
            />
          )}
        </aside>

        {/* Chat pane */}
        <section className="flex flex-col min-h-0">
          {/* Mobile list header */}
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
                    <button
                      onClick={() => setNewOpen(true)}
                      className="p-2 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90"
                      aria-label="New message"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                    </button>
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

          {/* Mobile conversation list */}
          <div className="md:hidden flex-1 min-h-0">
            {!activeId &&
              (loadingThreads ? (
                <div className="p-4 space-y-3 animate-pulse">
                  <div className="h-6 w-32 bg-gray-700 rounded" />
                  <div className="h-6 w-40 bg-gray-700 rounded" />
                </div>
              ) : threadError ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-red-400">Failed to load threads.</p>
                  <button
                    onClick={() => {
                      setThreadError(false);
                      fetchThreads();
                    }}
                    className="mt-2 px-3 py-1 bg-red-600 rounded text-white text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <ConversationList
                  threads={threads}
                  activeId={activeId}
                  onPick={(id) => setActiveId(id)}
                  onNew={() => setNewOpen(true)}
                  totalUnread={totalUnread}
                  isLoading={loadingThreads}
                />
              ))}
          </div>

          {/* Chat selected */}
          {activeId && (
            <>
              <div className="sticky top-0 z-20">
                <ChatHeader
                  thread={activeThread}
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  onBack={() => setActiveId(null)}
                  showBackOnMobile
                  hasActive={!!activeId}
                  onToggleInfo={() => setInfoOpen(true)}
                />
              </div>

              {isLoadingMsgs ? (
                <div className="flex-1 flex items-center justify-center animate-pulse text-gray-400">
                  Loading messages...
                </div>
              ) : msgError ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-red-400">Failed to load messages.</p>
                  <button
                    onClick={() => {
                      setMsgError(false);
                      fetchMessages(activeId);
                    }}
                    className="mt-2 px-3 py-1 bg-red-600 rounded text-white text-sm"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <ChatContainer
                    key={activeId}
                    thread={activeThread}
                    items={msgs}
                    meId={user?.id}
                    loading={isLoadingMsgs}
                    bottomPaddingClass="pb-24 md:pb-28 [padding-bottom:env(safe-area-inset-bottom)]"
                  />
                  <div className="sticky bottom-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 [padding-bottom:env(safe-area-inset-bottom)]">
                    <Composer chatGroupId={activeId} />
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile overlay + drawer */}
      <div
        className={[
          "fixed inset-0 bg-black/40 z-40 md:hidden",
          sidebarOpen ? "block" : "hidden",
        ].join(" ")}
        onClick={() => setSidebarOpen(false)}
      />
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

      {/* Dialogs */}
      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleNewChatCreated}
      />
      <NewGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={handleNewChatCreated}
      />
      <InfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        thread={activeThread}
      />
    </>
  );
}
