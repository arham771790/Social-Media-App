"use client";

import { useEffect, useState } from "react";
import { Users, Search, Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMessageStore } from "@/store/messageStore";
import { useToast } from "@/hooks/use-toast";
import UserSearchResults from "./UserSearchResults";

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
  existingMembers = [],
}) {
  const { toast } = useToast();
  const searchUsers = useMessageStore((s) => s.searchUsers);
  const addGroupMembers = useMessageStore((s) => s.addGroupMembersAction);
  const fetchThreads = useMessageStore((s) => s.fetchThreads);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);

  const debounced = useDebounced(query.trim(), 350);
  const existingIds = new Set((existingMembers || []).map((m) => m.id));

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setUsers([]);
    setSelected([]);
    setError(null);
    setLoading(true);
    searchUsers("")
      .then((arr) => setUsers(arr.filter((u) => !existingIds.has(u.id))))
      .catch((e) => {
        const msg = e?.response?.data?.error || "Failed to load users";
        setError(msg);
        toast({ variant: "destructive", title: "Error", description: msg });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchUsers(debounced)
      .then((arr) => setUsers(arr.filter((u) => !existingIds.has(u.id))))
      .catch((e) => {
        const msg = e?.response?.data?.error || "Failed to search users";
        setError(msg);
        toast({ variant: "destructive", title: "Search failed", description: msg });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const toggle = (user) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const addSelected = async () => {
    if (!selected.length || busy) return;
    setBusy(true);
    try {
      await addGroupMembers(chatGroupId, selected.map((u) => u.id));
      await fetchThreads();
      toast({
        title: "Members added",
        description: `${selected.length} user(s) added.`,
      });
      onOpenChange?.(false);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to add",
        description: e?.response?.data?.error || "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100svh] sm:h-auto w-full sm:max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Users className="w-5 h-5 text-primary" />
            Add members
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Search and select users to add to this group.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username…"
              className="pl-9 rounded-lg shadow-sm focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Selected Users Preview */}
        {selected.length > 0 && (
          <div className="px-6 pb-2">
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {u.name || u.username}
                  <button
                    onClick={() => toggle(u)}
                    className="ml-1 hover:text-red-500"
                  >
                    <UserX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* User List */}
        <div className="px-6 pb-6">
          <div className="h-[60svh] sm:h-72 mt-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20">
            <UserSearchResults
              users={users}
              loading={loading}
              error={error}
              selectedUsers={selected}
              groupMode={true}
              onUserSelect={toggle}
              onStartDM={() => {}}
              busyId={null}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/40 backdrop-blur-sm">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            className="rounded-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={addSelected}
            disabled={!selected.length || busy}
            className="rounded-lg"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {selected.length ? `(${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
