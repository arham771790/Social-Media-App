// src/components/messages/dialogs/NewGroupDialog.jsx
"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import api from "@/lib/axios";
import { useMessageStore } from "@/store/messageStore";

const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX ?? "/api") || "";
const ep = (p) => `${API_PREFIX}${p}`;

export default function NewGroupDialog({ open, onOpenChange, onCreated }) {
  const fetchThreads = useMessageStore((s) => s.fetchThreads);

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]); // array of user objects
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const debounced = useDebounced(query, 300);

  useEffect(() => {
    if (!open) return;
    setUsers([]);
    setSelected([]);
    setError(null);
    setName("");
    setLoading(true);
    api
      .get(ep("/messages/users"), { params: debounced ? { search: debounced } : {} })
      .then((res) => setUsers(Array.isArray(res?.data) ? res.data : []))
      .catch((e) => setError(e?.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
  }, [open, debounced]);

  const toggleSelect = (u) => {
    setSelected((prev) =>
      prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  };

  const createGroup = async () => {
    if (!name.trim() || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        memberIds: selected.map((u) => u.id),
      };
      const { data } = await api.post(ep("/messages/group"), body);
      const gid = data?.chatGroup?.id || data?.id;
      await fetchThreads();
      onOpenChange?.(false);
      if (gid && typeof onCreated === "function") onCreated(gid);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[92vw] max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            New group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to add members…"
          />

          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u.id}
                className="px-2 py-0.5 rounded-full bg-muted text-sm inline-flex items-center gap-2"
              >
                @{u.username}
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleSelect(u)}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="max-h-[45vh] overflow-y-auto rounded border">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500">{error}</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No users found.</div>
            ) : (
              <ul className="divide-y">
                {users.map((u) => {
                  const active = !!selected.find((x) => x.id === u.id);
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleSelect(u)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">@{u.username}</div>
                          {u.bio && (
                            <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {u.bio}
                            </div>
                          )}
                        </div>
                      </div>
                      <input type="checkbox" readOnly checked={active} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
          <Button onClick={createGroup} disabled={busy || !name.trim() || selected.length === 0}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useDebounced(value, delay = 300) {
  const [val, setVal] = useState(value);
  const t = useRef();
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setVal(value), delay);
    return () => clearTimeout(t.current);
  }, [value, delay]);
  return val;
}
