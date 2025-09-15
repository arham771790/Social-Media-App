"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessageStore } from "@/store/messageStore";
import { useUploadStore } from "@/store/uploadStore";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";

import {
  upsertThreadLastMessage,
  setThreadUnread,
} from "@/lib/threadsCache";

export default function Composer({ chatGroupId, className = "" }) {
  const { toast } = useToast();
  const me = useAuthStore((s) => s.user);

  const sendMessage = useMessageStore((s) => s.sendMessage);
  const startTyping = useMessageStore((s) => s.startTyping);
  const stopTyping = useMessageStore((s) => s.stopTyping);
  const uploadFile = useUploadStore((s) => s.uploadFile);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const typingTimer = useRef(null);

  const sendTyping = (isTyping) => {
    if (!chatGroupId) return;
    if (isTyping) startTyping(chatGroupId);
    else stopTyping(chatGroupId);
  };

  const onTyping = () => {
    clearTimeout(typingTimer.current);
    sendTyping(true);
    typingTimer.current = setTimeout(() => sendTyping(false), 1200);
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    toast({ title: "Attachment ready", description: f.name, duration: 1200 });
  };

  const optimisticBump = (payload) => {
    // Normalize to the lastMessage shape used in list
    const type = payload.fileType
      ? (payload.fileType?.toUpperCase().startsWith("VIDEO") ? "VIDEO" :
         payload.fileType?.toUpperCase().startsWith("IMAGE") ? "IMAGE" :
         "FILE")
      : "TEXT";

    const content =
      payload.content ??
      (type === "IMAGE" ? "📷 Photo" :
       type === "VIDEO" ? "🎥 Video" :
       type === "FILE"  ? "📎 File"  : "");

    const message = {
      content,
      type,
      timestamp: Date.now(),
      sender: me ? { id: me.id, username: me.username } : null,
    };

    // Reorder to top, reset unread for current user
    upsertThreadLastMessage(chatGroupId, message, { moveToTop: true, resetUnread: true });
    setThreadUnread(chatGroupId, 0);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !chatGroupId) return;

    try {
      setBusy(true);

      // Optimistically update the list BEFORE hitting the network
      if (file) {
        optimisticBump({
          fileType: file.type,
          content: null,
        });
      } else if (text.trim()) {
        optimisticBump({
          content: text.trim(),
          fileType: null,
        });
      }

      // Upload/send
      if (file) {
        const uploaded = await uploadFile(file);
        const mediaUrl = uploaded?.optimizedUrl || uploaded?.originalUrl;
        if (mediaUrl) {
          await sendMessage(chatGroupId, {
            mediaUrl,
            mimeType: file.type,
            fileType: file.type.startsWith("video") ? "video" : "image",
          });
        }
        setFile(null);
        setPreview("");
      }
      const val = text.trim();
      if (val) {
        await sendMessage(chatGroupId, { content: val });
        setText("");
      }

      toast({ title: "Sent", duration: 900 });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: err?.response?.data?.error || "Please try again.",
      });
    } finally {
      setBusy(false);
      sendTyping(false);
    }
  };

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  return (
    <form onSubmit={submit} className={`flex items-center gap-2 p-2 sm:p-3 ${className}`}>
      {preview && (
        <div className="flex items-center gap-3 px-2 py-1 rounded bg-muted/40 mr-auto">
          {file?.type?.startsWith("video") ? (
            <video src={preview} className="h-14 sm:h-16 rounded" muted playsInline />
          ) : (
            <img src={preview} className="h-14 sm:h-16 rounded" alt="preview" />
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => {
              setFile(null);
              setPreview("");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <label className="cursor-pointer p-2 rounded hover:bg-muted shrink-0">
        <Paperclip className="w-5 h-5" />
        <input type="file" className="hidden" onChange={handleFile} accept="image/*,video/*" />
      </label>

      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping();
        }}
        placeholder="Message…"
        className="flex-1 text-sm"
        onFocus={() => sendTyping(true)}
        onBlur={() => sendTyping(false)}
        disabled={busy || !chatGroupId}
      />

      <Button
        type="submit"
        className="shrink-0"
        disabled={busy || (!text.trim() && !file) || !chatGroupId}
        aria-label="Send message"
      >
        <Send className="w-4 h-4 mr-1 hidden sm:inline" />
        <Send className="w-5 h-5 sm:hidden" />
        <span className="hidden sm:inline">{busy ? "Sending…" : "Send"}</span>
      </Button>
    </form>
  );
}
