// src/components/messages/dialogs/NewGroupDialog.jsx
"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import UserSearchResults from "./UserSearchResults";
import GroupCreationForm from "./GroupCreationForm";
import { useMessageStore } from "@/store/messageStore";
import { useAuthStore } from "@/store/authStore";

const useDebounced = (v, d = 300) => {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return val;
};

export default function NewGroupDialog({ open, onOpenChange, onCreated }) {
  const me = useAuthStore((s) => s.user);
  const fetchThreads = useMessageStore((s) => s.fetchThreads);
  const searchUsers = useMessageStore((s) => s.searchUsers);
  const createGroup = useMessageStore((s) => s.createGroup);

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const debounced = useDebounced(query.trim(), 350);

  useEffect(() => {
    if (!open) return;
    setUsers([]);
    setSelected([]);
    setGroupName("");
    setError(null);
    setLoading(true);
    searchUsers("")
      .then((arr) => setUsers(arr.filter((u) => u.id !== me?.id)))
      .catch((e) => setError(e?.response?.data?.error || "Failed to load users"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    searchUsers(debounced)
      .then((arr) => setUsers(arr.filter((u) => u.id !== me?.id)))
      .catch((e) => setError(e?.response?.data?.error || "Failed to search users"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const toggleSelect = (u) => {
    setSelected((prev) =>
      prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]
    );
  };

  const onCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: groupName.trim(),
        memberIds: selected.map((u) => u.id),
      };
      const data = await createGroup(body);
      const gid = data?.chatGroup?.id;
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
      <DialogContent className="sm:max-w-md !bg-white border-border/50 shadow-2xl">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <UsersIcon className="w-5 h-5 text-primary" />
            New Group
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select members and name your group.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 px-6">
          <GroupCreationForm
            groupName={groupName}
            setGroupName={setGroupName}
            selectedUsers={selected}
            onRemoveUser={toggleSelect}
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search to add members…"
              className="pl-9 border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
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
            onClick={onCreateGroup}
            disabled={busy || !groupName.trim() || selected.length === 0}
            className="w-full sm:w-auto"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Group ({selected.length})
          </Button>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
