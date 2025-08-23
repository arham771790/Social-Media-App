"use client";
import { useEffect, useMemo, useState } from "react";
import { io as ioClient } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ConversationList from "@/components/messages/ConversationList";
import ChatHeader from "@/components/messages/ChatHeader";
import MessageList from "@/components/messages/MessageList";
import Composer from "@/components/messages/Composer";
import NewMessageDialog from "@/components/messages/dialogs/NewMessageDialog";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

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

  const [activeId, setActiveId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize socket and fetch threads
  useEffect(() => {
    if (!token || !user) return;
    
    bindSocket(ioClient, token);
    fetchThreads().then((ts) => {
      if (!ts?.length) {
        setNewOpen(true);
      } else if (!activeId && ts?.length) {
        setActiveId(ts[0].id);
      }
    }).catch(() => {});
  }, [token, user, bindSocket, fetchThreads]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeId) return;
    
    fetchMessages(activeId)
      .then(() => markRead(activeId))
      .catch(() => {});
    joinRoom(activeId);
  }, [activeId, fetchMessages, markRead, joinRoom]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId),
    [threads, activeId]
  );
  
  const msgs = messagesByGroup[activeId]?.items || [];
  const messagesLoading = messagesByGroup[activeId]?.isLoading || false;

  // Handle thread selection
  const handleThreadSelect = (threadId) => {
    setActiveId(threadId);
    setSidebarOpen(false); // Close sidebar on mobile after selection
  };

  // Handle new chat creation
  const handleNewChatCreated = (chatId) => {
    setActiveId(chatId);
    setNewOpen(false);
    setSidebarOpen(false);
  };

  if (isLoading && threads.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error && threads.length === 0) {
    return (
      <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={() => fetchThreads()}
            className="text-primary hover:underline"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] max-w-6xl mx-auto">
      {/* Mobile: Show sidebar overlay when open */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="h-full grid grid-cols-1 md:grid-cols-[320px_1fr] border rounded-lg overflow-hidden bg-card">
        {/* Conversation List - Mobile: Overlay, Desktop: Fixed */}
        <div className={`
          ${sidebarOpen ? 'fixed inset-y-0 left-0 z-50 w-80' : 'hidden'} 
          md:relative md:block md:w-full md:z-auto
          bg-card border-r border-border
        `}>
          <ConversationList
            threads={threads}
            activeId={activeId}
            onPick={handleThreadSelect}
            onNew={() => setNewOpen(true)}
            totalUnread={totalUnread}
            isLoading={isLoading}
          />
        </div>

        {/* Chat Area */}
        <div className="flex flex-col min-h-0 relative">
          {activeId && activeThread ? (
            <>
              <ChatHeader 
                thread={activeThread} 
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              />
              <MessageList 
                items={msgs} 
                meId={user?.id} 
                isLoading={messagesLoading}
                chatGroupId={activeId}
              />
              <Composer chatGroupId={activeId} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Your Messages</h3>
                <p className="text-muted-foreground max-w-sm">
                  {threads.length === 0 
                    ? "Start a conversation with someone to see your messages here."
                    : "Select a conversation to start messaging."
                  }
                </p>
              </div>
              <button
                onClick={() => setNewOpen(true)}
                className="text-primary hover:underline font-medium"
              >
                Send your first message
              </button>
              
              {/* Mobile: Show conversations button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-sm text-muted-foreground hover:text-foreground"
              >
                View conversations
              </button>
            </div>
          )}
        </div>
      </div>

      <NewMessageDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={handleNewChatCreated}
      />
    </div>
  );
}