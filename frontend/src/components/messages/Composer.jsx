// src/components/messages/Composer.jsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Send, Paperclip, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chatStore";
import { useUploadStore } from "@/store/uploadStore";
import { cn } from "@/lib/utils";

function detectKind(file) {
  if (!file) return "file";
  const t = file.type.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  return "file";
}

export default function Composer({ chatGroupId }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const uploadFile = useUploadStore((s) => s.uploadFile);
  const isUploading = useUploadStore((s) => s.isUploading);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  const kind = useMemo(() => detectKind(file), [file]);
  const canSend = (text.trim().length > 0 || !!file) && !busy && !isUploading;

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const actuallySend = async () => {
    // 1) upload if we have an attachment
    let mediaUrl = null;
    if (file) {
      const uploaded = await uploadFile(file); // returns { originalUrl, optimizedUrl, ... }
      mediaUrl = uploaded?.optimizedUrl || uploaded?.originalUrl;
    }

    // 2) send message (text and/or media). Backend infers type from mediaUrl.
    await sendMessage(chatGroupId, {
      content: text.trim() || null,
      mediaUrl: mediaUrl || null,
    });
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!canSend) return;
    setBusy(true);
    try {
      await actuallySend();
      // reset UI
      setText("");
      clearFile();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-t border-border px-3 py-2 flex items-center gap-2">
      {/* Attachment preview row */}
      {(previewUrl || isUploading) && (
        <div className="absolute bottom-[60px] left-0 right-0 px-3">
          <div className="mx-3 mb-2 rounded-lg border bg-card p-2 flex items-center gap-3">
            <div className="shrink-0">
              {kind === "image" && <img src={previewUrl} alt="preview" className="w-20 h-20 object-cover rounded" />}
              {kind === "video" && (
                <video src={previewUrl} className="w-24 h-20 object-cover rounded" muted playsInline controls />
              )}
              {kind === "file" && (
                <div className="w-24 h-20 grid place-items-center bg-muted rounded text-xs">
                  {file?.name || "Attachment"}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 text-xs">
              <div className="truncate">{file?.name}</div>
              <div className={cn("mt-1", isUploading ? "text-blue-500" : "text-muted-foreground")}>
                {isUploading ? "Uploading…" : kind === "file" ? "Ready to send" : "Ready to send"}
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="shrink-0"
              onClick={clearFile}
              disabled={busy || isUploading}
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <label className="cursor-pointer p-2 hover:bg-muted rounded relative">
        <Paperclip className="w-4 h-4" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={pickFile}
          disabled={busy || isUploading}
        />
      </label>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isUploading ? "Uploading attachment…" : busy ? "Sending…" : "Message…"}
        className="flex-1"
        disabled={busy || isUploading}
      />

      <Button type="submit" disabled={!canSend}>
        {(busy || isUploading) ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
        {(busy || isUploading) ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
