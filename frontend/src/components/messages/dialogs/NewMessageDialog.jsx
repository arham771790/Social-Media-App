"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessageSquarePlus, Users, User } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

/** debounce */
const useDebounced = (v, d = 300) => {
  const [val, setVal] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setVal(v), d);
    return () => clearTimeout(t);
  }, [v, d]);
  return val;
};

export default function NewMessageDialog({ open, onOpenChange, onCreated }) {
  const router = useRouter();
  const { toast } = useToast();
  const me = useAuthStore((s) => s.user);
  const fetchThreads = useMessageStore((s) => s.fetchThreads);
  const searchUsers = useMessageStore((s) => s.searchUsers);
  const createDirect = useMessageStore((s) => s.createDirect);
  const createGroup = useMessageStore((s) => s.createGroup);

  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");

  const debounced = useDebounced(query.trim(), 350);

  useEffect(() => {
    if (!open) return;
    // reset each open
    setQuery("");
    setUsers([]);
    setError(null);
    setSelectedUsers([]);
    setGroupMode(false);
    setGroupName("");
    setLoading(true);

    searchUsers("")
      .then((arr) => setUsers(arr.filter((u) => u.id !== me?.id)))
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
      .then((arr) => setUsers(arr.filter((u) => u.id !== me?.id)))
      .catch((e) => {
        const msg = e?.response?.data?.error || "Failed to search users";
        setError(msg);
        toast({ variant: "destructive", title: "Search failed", description: msg });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const onStartDM = async (userId) => {
    if (!userId || busyId) return;
    setBusyId(userId);
    setError(null);
    try {
      const data = await createDirect(userId);
      const chatId = data?.chatGroup?.id;
      await fetchThreads();
      onOpenChange?.(false);
      toast({ title: "Chat created" });
      if (typeof onCreated === "function" && chatId) onCreated(chatId);
      else if (chatId) router.push("/messages");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to start chat";
      setError(msg);
      toast({ variant: "destructive", title: "Error", description: msg });
    } finally {
      setBusyId(null);
    }
  };

  const onCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: groupName.trim(),
        memberIds: selectedUsers.map((u) => u.id),
      };
      const data = await createGroup(body);
      const chatId = data?.chatGroup?.id;
      await fetchThreads();
      onOpenChange?.(false);
      toast({ title: "Group created" });
      if (typeof onCreated === "function" && chatId) onCreated(chatId);
      else if (chatId) router.push("/messages");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to create group";
      setError(msg);
      toast({ variant: "destructive", title: "Error", description: msg });
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

  const ModeToggle = () => (
    <div className="inline-flex items-center p-1 space-x-1 bg-muted/50 rounded-lg border border-border/50">
      <Button
        variant={!groupMode ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setGroupMode(false)}
        className="w-full shadow-sm"
      >
        <User className="w-4 h-4 mr-2" />
        Direct
      </Button>
      <Button
        variant={groupMode ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setGroupMode(true)}
        className="w-full shadow-sm"
      >
        <Users className="w-4 h-4 mr-2" />
        Group
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mobile: fullscreen; Desktop: normal card */}
      <DialogContent className="h-[100svh] sm:h-auto w-full sm:max-w-md !bg-white border-border/50 shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <MessageSquarePlus className="w-5 h-5 text-primary" />
            New Message
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {groupMode
              ? "Select members and name your group."
              : "Find someone to message directly."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 px-6">
          <ModeToggle />

          {groupMode && (
            <GroupCreationForm
              groupName={groupName}
              setGroupName={setGroupName}
              selectedUsers={selectedUsers}
              onRemoveUser={toggleUserSelection}
            />
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username…"
              className="pl-9 border-2 focus-visible:ring-2 focus-visible:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="h-[60svh] sm:h-72 mt-2 overflow-y-auto rounded-lg border-2 border-border/50 bg-muted/20">
            <UserSearchResults
              users={users}
              loading={loading}
              error={error}
              selectedUsers={selectedUsers}
              groupMode={groupMode}
              onUserSelect={toggleUserSelection}
              onStartDM={onStartDM}
              busyId={busyId}
            />
          </div>
        </div>

        <DialogFooter className="bg-muted/30 p-4 border-t border-border/50">
          {groupMode && (
            <Button
              onClick={onCreateGroup}
              disabled={busy || !groupName.trim() || selectedUsers.length === 0}
              className="w-full sm:w-auto"
            >
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Group ({selectedUsers.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
