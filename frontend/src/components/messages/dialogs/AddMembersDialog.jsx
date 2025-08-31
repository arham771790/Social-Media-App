"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessageStore } from "@/store/messageStore";
import { useAuthStore } from "@/store/authStore";
import UserSearchResults from "./UserSearchResults";

// debounce
const useDebounced = (v, d = 300) => {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return val;
};

export default function AddMembersDialog({
  open,
  onOpenChange,
  chatGroupId,
  existingMembers = [], // array of {id}
}) {
  const me = useAuthStore((s) => s.user);
  const searchUsers = useMessageStore((s) => s.searchUsers);
  const addGroupMembersAction = useMessageStore((s) => s.addGroupMembersAction);
  const fetchThreads = useMessageStore((s) => s.fetchThreads);

  const existingIds = useMemo(
    () => new Set((existingMembers || []).map((m) => String(m.id))),
    [existingMembers]
  );

  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 350);

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // reset on open
  useEffect(() => {
    if (!open) return;
    setUsers([]);
    setSelected([]);
    setError(null);
    setQuery("");
    setLoading(true);
    searchUsers("")
      .then((arr) =>
        setUsers(
          arr
            .filter((u) => u.id !== me?.id)
            .filter((u) => !existingIds.has(String(u.id)))
        )
      )
      .catch((e) => setError(e?.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // live search
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchUsers(debounced)
      .then((arr) =>
        setUsers(
          arr
            .filter((u) => u.id !== me?.id)
            .filter((u) => !existingIds.has(String(u.id)))
        )
      )
      .catch((e) => setError(e?.response?.data?.error || "Failed to search users"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const toggleSelect = (u) => {
    setSelected((prev) =>
      prev.find((x) => x.id === u.id)
        ? prev.filter((x) => x.id !== u.id)
        : [...prev, u]
    );
  };

  const onAdd = async () => {
    if (!chatGroupId || selected.length === 0 || busy) return;
    setBusy(true);
    try {
      const ids = selected.map((u) => u.id);
      await addGroupMembersAction(chatGroupId, ids);
      await fetchThreads(); // make sure sidebar reflects new members in thread object
      onOpenChange?.(false);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to add members");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md !bg-white/80 backdrop-blur-lg border-border/50 shadow-2xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Users className="w-5 h-5 text-primary" />
            Add Members
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Search and select people to add to this group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="pl-9 border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="h-72 mt-2 overflow-y-auto rounded-lg border-2 border-border/50 bg-muted/20">
            <UserSearchResults
              users={users}
              loading={loading}
              error={error}
              selectedUsers={selected}
              groupMode
              onUserSelect={toggleSelect}
            />
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-4 border-t border-border/50">
          <Button
            onClick={onAdd}
            disabled={busy || selected.length === 0}
            className="w-full sm:w-auto"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add ({selected.length})
          </Button>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
