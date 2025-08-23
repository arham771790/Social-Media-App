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
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");

  const q = query.trim();
  const debounced = useDebouncedValue(q, 300);

  useEffect(() => {
    if (!open) return;
    // Reset state when dialog opens
    setUsers([]);
    setError(null);
    setSelectedUsers([]);
    setGroupMode(false);
    setGroupName("");
    setQuery("");
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

  const onCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/api/messages/group", {
        name: groupName.trim(),
        memberIds: selectedUsers.map(u => u.id),
      });
      const chatId = data?.chatGroup?.id;
      await fetchThreads();
      onOpenChange?.(false);
      if (typeof onCreated === "function" && chatId) onCreated(chatId);
      else if (chatId) router.push("/messages");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to create group");
    } finally {
      setBusy(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.id === user.id);
      if (exists) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5" />
            {groupMode ? "Create Group Chat" : "New Message"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={!groupMode ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupMode(false)}
            >
              Direct Message
            </Button>
            <Button
              variant={groupMode ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupMode(true)}
            >
              Group Chat
            </Button>
          </div>

          {/* Group name input (only in group mode) */}
          {groupMode && (
            <div>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name..."
                className="mb-2"
              />
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedUsers.map(user => (
                    <Badge 
                      key={user.id} 
                      variant="secondary" 
                      className="gap-1 cursor-pointer"
                      onClick={() => toggleUserSelection(user)}
                    >
                      {user.username}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username…"
              className="pl-9"
              autoFocus={!groupMode}
            />
          </div>

          {/* Results */}
          <div className="flex-1 min-h-0 rounded-md border overflow-hidden">
            <div className="h-full overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching…
                </div>
              ) : error ? (
                <div className="py-6 text-center text-sm text-red-500">{error}</div>
              ) : users.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {query ? "No users found." : "Start typing to search for users."}
                </div>
              ) : (
                <ul className="divide-y">
                  {users.map((u) => {
                    const isSelected = selectedUsers.find(su => su.id === u.id);
                    return (
                      <li 
                        key={u.id} 
                        className={`flex items-center justify-between gap-3 px-3 py-3 hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-muted" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatar || undefined} />
                            <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">@{u.username}</div>
                            {u.bio && (
                              <div className="text-xs text-muted-foreground truncate">
                                {u.bio}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {groupMode ? (
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() => toggleUserSelection(u)}
                            disabled={u.id === me?.id}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => onStartDM(u.id)} 
                            disabled={busy || u.id === me?.id}
                          >
                            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Message
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>


        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          {groupMode && (
            <Button 
              onClick={onCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0 || busy}
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Group ({selectedUsers.length})
            </Button>
          )}
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
