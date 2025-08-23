"use client";

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Send, Paperclip, X, Loader2, Image as ImageIcon, Video, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  const [dragOver, setDragOver] = useState(false);
  
  const startTyping = useChatStore(s => s.startTyping);
  const stopTyping = useChatStore(s => s.stopTyping);
  
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const kind = useMemo(() => detectKind(file), [file]);
  const canSend = (text.trim().length > 0 || !!file) && !busy && !isUploading;

  const pickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const actuallySend = async () => {
    let mediaUrl = null;
    if (file) {
      const uploaded = await uploadFile(file);
      mediaUrl = uploaded?.optimizedUrl || uploaded?.originalUrl;
    }

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
      setText("");
      clearFile();
      textInputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageOrVideo = files.find(f => 
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    
    if (imageOrVideo) {
      setFile(imageOrVideo);
      setPreviewUrl(URL.createObjectURL(imageOrVideo));
    }
  }, []);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Handle typing indicators
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    
    // Start typing indicator
    if (newText.trim() && !text.trim()) {
      startTyping(chatGroupId);
    }
    
    // Reset typing timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chatGroupId);
    }, 1000);
  };

  // Stop typing on unmount or chat change
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      stopTyping(chatGroupId);
    };
  }, [chatGroupId, stopTyping]);

  // Stop typing when sending message
  const handleSubmit = async (e) => {
    e?.preventDefault();
    clearTimeout(typingTimeoutRef.current);
    stopTyping(chatGroupId);
    await submit(e);
    }
  };

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm">
      {/* File preview */}
      {(previewUrl || isUploading) && (
        <div className="p-3 border-b border-border">
          <Card className="p-3 flex items-center gap-3">
            <div className="shrink-0">
              {kind === "image" && (
                <div className="relative">
                  <img 
                    src={previewUrl} 
                    alt="preview" 
                    className="w-16 h-16 object-cover rounded-lg" 
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              {kind === "video" && (
                <div className="relative">
                  <video 
                    src={previewUrl} 
                    className="w-20 h-16 object-cover rounded-lg" 
                    muted 
                    playsInline 
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              {kind === "file" && (
                <div className="w-16 h-16 grid place-items-center bg-muted rounded-lg">
                  <File className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{file?.name}</div>
              <div className={cn(
                "text-xs mt-1",
                isUploading ? "text-blue-500" : "text-muted-foreground"
              )}>
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  `${kind === "file" ? "Document" : kind} • Ready to send`
                )}
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={clearFile}
              disabled={busy || isUploading}
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3">
        <div 
          className={cn(
            "flex items-end gap-2 p-2 rounded-2xl border transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border bg-background",
            "focus-within:border-primary"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Attachment button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={pickFile}
            disabled={busy || isUploading}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <Input
              ref={textInputRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isUploading ? "Uploading attachment..." : 
                busy ? "Sending..." : 
                "Type a message..."
              }
              className="border-0 bg-transparent focus-visible:ring-0 resize-none min-h-[40px] max-h-[120px]"
              disabled={busy || isUploading}
              autoComplete="off"
            />
          </div>

          {/* Emoji button */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Add emoji"
          >
            <Smile className="w-5 h-5" />
          </Button>

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className={cn(
              "shrink-0 transition-all",
              canSend ? "bg-primary hover:bg-primary/90" : "bg-muted"
            )}
          >
            {(busy || isUploading) ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,*/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={busy || isUploading}
          />
        </div>

        {/* Drag overlay */}
        {dragOver && (
          <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-2">
              <Paperclip className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-medium text-primary">Drop files to attach</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}