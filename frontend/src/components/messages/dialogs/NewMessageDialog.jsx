"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/axios";
import { useMessageStore } from "@/store/messageStore";
import { useAuthStore } from "@/store/authStore";

const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX) || "";
const ep = (p) => `${API_PREFIX}${p}`;

export default function NewMessageDialog({ open, onOpenChange, onCreated }) {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const fetchThreads = useMessageStore((s) => s.fetchThreads);

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
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
    setUsers([]);
    setError(null);
    setSelectedUsers([]);
    setGroupMode(false);
    setGroupName("");
    setQuery("");
    setLoading(true);

    api
      .get(ep("/messages/users"), { params: debounced ? { search: debounced } : {} })
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setUsers(arr);
      })
      .catch((e) => setError(e?.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [open, debounced]);

  const onStartDM = async (userId) => {
    if (!userId || busyId) return;
    setBusyId(userId);
    setError(null);
    try {
      const { data } = await api.post(ep("/messages/direct"), { targetUserId: userId });
      const chatId = data?.chatGroup?.id;
      await fetchThreads();
      onOpenChange?.(false);
      if (typeof onCreated === "function" && chatId) onCreated(chatId);
      else if (chatId) router.push("/messages");
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to start chat");
    } finally {
      setBusyId(null);
    }
  };

  const onCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post(ep("/messages/group"), {
        name: groupName.trim(),
        memberIds: selectedUsers.map((u) => u.id),
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
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

          {/* Group name / chips */}
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
                  {selectedUsers.map((user) => (
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

          {/* Search */}
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
          <div className="max-h-80 overflow-y-auto mt-3 rounded-md border bw-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Searching…
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-red-500">{error}</div>
            ) : users.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No users found.
              </div>
            ) : (
              <ul className="divide-y">
                {users.map((u) => {
                  const selected = !!selectedUsers.find((x) => x.id === u.id);
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback>
                            {u.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">@{u.username}</div>
                          {u.bio && (
                            <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                              {u.bio}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => onStartDM(u.id)}
                          disabled={!!busyId || u.id === me?.id}
                        >
                          {busyId === u.id && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Message
                        </Button>

                        {groupMode && (
                          <Button
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            onClick={() => toggleUserSelection(u)}
                          >
                            {selected ? "Selected" : "Select"}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            {groupMode ? (
              <Button
                onClick={onCreateGroup}
                disabled={busy || !groupName.trim() || selectedUsers.length === 0}
              >
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Group
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
