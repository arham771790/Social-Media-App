// src/components/messages/dialogs/NewMessageDialog.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";

export default function NewMessageDialog({ open, onOpenChange, onCreated }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const fetchThreads = useChatStore((s) => s.fetchThreads);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const q = query.trim();
  const debounced = useDebouncedValue(q, 300);

  useEffect(() => {
    if (!open) return;
    setUsers([]);
    setError(null);
    setLoading(true);
    api
      .get("/api/messages/users", { params: debounced ? { search: debounced } : {} })
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setUsers(arr);
      })
      .catch((e) => setError(e?.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [open, debounced]);

  const onStartDM = async (userId) => {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/api/messages/direct", { targetUserId: userId });
      const chatId = data?.chatGroup?.id;
      await fetchThreads();
      onOpenChange?.(false);
      if (typeof onCreated === "function" && chatId) onCreated(chatId);
      else if (chatId) router.push("/messages");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to start chat");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            New message
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search username…"
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto mt-3 rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching…
            </div>
          ) : error ? (
            <div className="py-6 text-center text-sm text-red-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No users found.</div>
          ) : (
            <ul className="divide-y">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatar || undefined} />
                      <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">@{u.username}</div>
                      {u.bio && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{u.bio}</div>}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => onStartDM(u.id)} disabled={busy || u.id === me?.id}>
                    {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Message
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange?.(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Debounce helper */
function useDebouncedValue(value, delay = 300) {
  const [val, setVal] = useState(value);
  const tRef = useRef(null);
  useEffect(() => {
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setVal(value), delay);
    return () => clearTimeout(tRef.current);
  }, [value, delay]);
  return val;
}
