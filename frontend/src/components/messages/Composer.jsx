// src/components/messages/Composer.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chatStore";
import { useUploadStore } from "@/store/uploadStore";

export default function Composer({ chatGroupId, className = "" }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const sendTyping = useChatStore((s) => s.sendTyping);
  const uploadFile = useUploadStore((s) => s.uploadFile);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");

  const typingTimer = useRef(null);

  const onTyping = () => {
    clearTimeout(typingTimer.current);
    sendTyping(chatGroupId, true);
    typingTimer.current = setTimeout(() => sendTyping(chatGroupId, false), 1200);
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;

    try {
      setBusy(true);
      if (file) {
        const uploaded = await uploadFile(file);
        const mediaUrl = uploaded.optimizedUrl || uploaded.originalUrl;
        await sendMessage(chatGroupId, { mediaUrl });
        setFile(null);
        setPreview("");
      }
      const val = text.trim();
      if (val) {
        await sendMessage(chatGroupId, { content: val });
        setText("");
      }
    } finally {
      setBusy(false);
      sendTyping(chatGroupId, false);
    }
  };

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  return (
    <form
      onSubmit={submit}
      className={`flex items-center gap-2 p-2 sm:p-3 ${className}`}
    >
      {preview && (
        <div className="flex items-center gap-3 px-2 py-1 rounded bg-muted/40 mr-auto">
          {file?.type?.startsWith("video") ? (
            <video src={preview} className="h-14 sm:h-16 rounded" muted playsInline />
          ) : (
            <img src={preview} className="h-14 sm:h-16 rounded" alt="preview" />
          )}
          <Button type="button" size="icon" variant="ghost" onClick={() => { setFile(null); setPreview(""); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <label className="cursor-pointer p-2 rounded hover:bg-muted shrink-0">
        <Paperclip className="w-4 h-4" />
        <input type="file" className="hidden" onChange={handleFile} accept="image/*,video/*" />
      </label>

      <Input
        value={text}
        onChange={(e) => { setText(e.target.value); onTyping(); }}
        placeholder="Message…"
        className="flex-1 text-sm"
        onFocus={() => sendTyping(chatGroupId, true)}
        onBlur={() => sendTyping(chatGroupId, false)}
        disabled={busy}
      />

      <Button type="submit" className="shrink-0" disabled={busy || (!text.trim() && !file)}>
        <Send className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">{busy ? "Sending…" : "Send"}</span>
      </Button>
    </form>
  );
}
