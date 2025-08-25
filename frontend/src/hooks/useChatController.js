"use client";
import { useEffect, useMemo } from "react";
import { useMessageStore } from "@/store/messageStore";

export function useChatController(opts = {}) {
  const {
    bindSocket,
    fetchThreads,
    fetchMessages,
    setActiveChat,
    loadOlder,
    markRead,
    sendMessage,
    threads,
    totalUnread,
    activeChatId,
    messagesByGroup,
    pageInfoByGroup,
    socketReady,
  } = useMessageStore();

  const { autoload = true, autoRestoreChat = true, token } = opts;

  // boot: socket + threads + optionally restore last chat
  useEffect(() => {
    bindSocket(token);
    if (autoload) fetchThreads();

    if (autoRestoreChat && typeof window !== "undefined") {
      const saved = localStorage.getItem("activeChatId");
      if (saved) setActiveChat(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // computed
  const activeMessages = useMemo(() => {
    return activeChatId ? (messagesByGroup[activeChatId] || []) : [];
  }, [messagesByGroup, activeChatId]);

  const activePageInfo = useMemo(() => {
    return activeChatId
      ? pageInfoByGroup[activeChatId] || { hasMore: false, before: null }
      : { hasMore: false, before: null };
  }, [pageInfoByGroup, activeChatId]);

  return {
    // state
    socketReady,
    threads,
    totalUnread,
    activeChatId,
    messages: activeMessages,
    pageInfo: activePageInfo,

    // actions
    setActiveChat,   // (chatId) => Promise<void>
    fetchThreads,    // () => Promise<void>
    fetchMessages,   // (chatId, limit?) => Promise<void>
    loadOlder,       // (chatId) => Promise<void>
    markRead,        // (chatId) => Promise<void>
    sendMessage,     // (chatId, {content?, mediaUrl?}) => Promise<void>
  };
}
