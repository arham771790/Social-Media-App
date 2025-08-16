"use client";
import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/store/chatStore";
import { useUploadStore } from "@/store/uploadStore";

export default function Composer({ chatGroupId }) {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const uploadFile = useUploadStore((s) => s.uploadFile);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await uploadFile(file);
      await sendMessage(chatGroupId, {
        type: uploaded.resourceType?.toUpperCase(),
        url: uploaded.optimizedUrl || uploaded.originalUrl,
      });
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    const val = text.trim();
    if (!val || busy) return;
    setBusy(true);
    try {
      await sendMessage(chatGroupId, { content: val, type: "TEXT" });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border-t border-border px-3 py-2 flex items-center gap-2"
    >
      <label className="cursor-pointer p-2 hover:bg-muted rounded">
        <Paperclip className="w-4 h-4" />
        <input type="file" className="hidden" onChange={handleFile} />
      </label>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Message..."
        className="flex-1"
      />
      <Button type="submit" disabled={busy || !text.trim()}>
        <Send className="w-4 h-4 mr-1" /> Send
      </Button>
    </form>
  );
}
