"use client";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { MessageSquare, Image as ImageIcon, Video, File, Download } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import TypingIndicator from "./TypingIndicator";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function MessageList({ items, meId, isLoading = false, chatGroupId }) {
  const scrollerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const getTypingUsers = useChatStore(s => s.getTypingUsers);
  const cleanupTyping = useChatStore(s => s.cleanupTyping);
  
  const typingUsers = getTypingUsers(chatGroupId);

  // Auto scroll to bottom when new messages arrive (only if user is at bottom)
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !autoScroll) return;
    
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [items, autoScroll]);

  // Track if user is scrolled to bottom
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Cleanup expired typing indicators
  useEffect(() => {
    const interval = setInterval(cleanupTyping, 1000);
    return () => clearInterval(interval);
  }, [cleanupTyping]);
  // Group messages by date
  const groupedMessages = items.reduce((groups, msg) => {
    const date = dayjs(msg.createdAt).format('YYYY-MM-DD');
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  if (isLoading && items.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 3 === 0 ? 'flex-row-reverse' : ''}`}>
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-4 w-32" />
              <Skeleton className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-32'}`} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">No messages yet</h3>
          <p className="text-sm text-muted-foreground">
            Start the conversation with a message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-y-auto p-4 space-y-1 scroll-smooth"
      onScroll={handleScroll}
    >
      {Object.entries(groupedMessages).map(([date, messages]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
              {dayjs(date).format('MMM D, YYYY')}
            </div>
          </div>

          {/* Messages for this date */}
          {messages.map((msg, index) => {
            const isMe = msg.senderId === meId;
            const showAvatar = !isMe && (
              index === 0 || 
              messages[index - 1]?.senderId !== msg.senderId ||
              dayjs(msg.createdAt).diff(dayjs(messages[index - 1]?.createdAt), 'minute') > 5
            );
            const isOptimistic = msg.optimistic;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 mb-2 ${isMe ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar (only show for others, and when needed) */}
                <div className="w-8 h-8 shrink-0">
                  {showAvatar ? (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.sender?.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {msg.sender?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : null}
                </div>

                {/* Message bubble */}
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {/* Sender name (for groups, non-me messages) */}
                  {!isMe && showAvatar && msg.sender?.username && (
                    <span className="text-xs text-muted-foreground mb-1 px-3">
                      {msg.sender.username}
                    </span>
                  )}

                  {/* Message content */}
                  <div
                    className={`
                      rounded-2xl px-4 py-2 max-w-full break-words
                      ${isMe 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted text-foreground rounded-bl-md"
                      }
                      ${isOptimistic ? "opacity-70" : ""}
                    `}
                  >
                    <MessageContent message={msg} />
                  </div>

                  {/* Timestamp and status */}
                  <div className={`text-xs text-muted-foreground mt-1 px-2 ${isMe ? "text-right" : "text-left"}`}>
                    <span>{dayjs(msg.createdAt).format("HH:mm")}</span>
                    {isMe && (
                      <span className="ml-2">
                        {isOptimistic ? "Sending..." : 
                         msg.readBy?.length > 1 ? "Read" : "Delivered"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Typing indicator */}
      <TypingIndicator usernames={typingUsers} />

      {/* Scroll to bottom indicator */}
      {!autoScroll && (
        <div className="sticky bottom-4 flex justify-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAutoScroll(true);
              scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
            }}
            className="shadow-lg"
          >
            Scroll to bottom
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageContent({ message }) {
  const { type, content, mediaUrl } = message;

  switch (type) {
    case "TEXT":
      return <p className="whitespace-pre-wrap">{content}</p>;

    case "IMAGE":
      return (
        <div className="space-y-2">
          {content && <p className="whitespace-pre-wrap">{content}</p>}
          <div className="relative group">
            <img
              src={mediaUrl}
              alt="Shared image"
              className="max-w-[280px] max-h-[400px] rounded-lg object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
          </div>
        </div>
      );

    case "VIDEO":
      return (
        <div className="space-y-2">
          {content && <p className="whitespace-pre-wrap">{content}</p>}
          <video
            src={mediaUrl}
            controls
            className="max-w-[280px] max-h-[400px] rounded-lg"
            preload="metadata"
          />
        </div>
      );

    case "FILE":
      return (
        <div className="space-y-2">
          {content && <p className="whitespace-pre-wrap">{content}</p>}
          <Card className="p-3 flex items-center gap-3 max-w-[280px]">
            <File className="w-8 h-8 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {mediaUrl?.split('/').pop() || "File"}
              </p>
              <p className="text-xs text-muted-foreground">Click to download</p>
            </div>
            <Button size="icon" variant="ghost" asChild>
              <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" />
              </a>
            </Button>
          </Card>
        </div>
      );

    case "CALL_INVITE":
      return (
        <Card className="p-3 flex items-center gap-3 max-w-[280px]">
          <Video className="w-8 h-8 text-blue-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Video call invitation</p>
            <p className="text-xs text-muted-foreground">
              {content || "Join the call"}
            </p>
          </div>
        </Card>
      );

    default:
      return <p className="whitespace-pre-wrap">{content || "Unsupported message type"}</p>;
  }
}