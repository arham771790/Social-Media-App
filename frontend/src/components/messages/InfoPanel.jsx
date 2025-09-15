"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, UserMinus2, UserPlus2, LogOut, Shield, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InfoPanel({
  thread,
  onClose,
  onRequestAddMembers,
  onRequestRemove,
  onRequestLeave,
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState("");

  const isGroup = (thread?.type || "").toUpperCase() === "GROUP";
  const members = thread?.members || [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.username?.toLowerCase().includes(q) ||
        m.name?.toLowerCase().includes(q) ||
        String(m.id).includes(q)
    );
  }, [filter, members]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={thread?.avatar || undefined} />
            <AvatarFallback>
              {(thread?.name || "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-semibold truncate">{thread?.name || "Thread"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {isGroup ? "Group" : "Direct message"}
            </div>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        {/* Group controls */}
        {isGroup && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm font-medium">Members ({members.length})</div>
            </div>

            {/* Search members */}
            <div className="flex items-center gap-2">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search members…"
                className="text-sm"
              />
              <Button
                type="button"
                onClick={onRequestAddMembers}
                className="shrink-0"
              >
                <UserPlus2 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </div>

            <Separator />

            {/* Member list */}
            <ul className="divide-y divide-border/60 rounded-md border border-border/60 overflow-hidden">
              {filtered.map((m) => (
                <li key={m.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatar || undefined} />
                      <AvatarFallback>{(m.name || "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{m.name || m.username || `User ${m.id}`}</div>
                      <div className="text-xs text-muted-foreground truncate">@{m.username || m.id}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {thread.adminIds?.includes(m.id) && (
                      <span className="inline-flex items-center text-[11px] gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        <Shield className="w-3 h-3" />
                        admin
                      </span>
                    )}
                    {/* Remove button (parent owns permission checks) */}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onRequestRemove?.(m.id)}
                      aria-label={`Remove ${m.username || m.name || m.id}`}
                    >
                      <UserMinus2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">No members match your search.</li>
              )}
            </ul>
          </div>
        )}

        {/* Non-group (direct) quick info */}
        {!isGroup && (
          <div className="p-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              This is a direct message thread.
            </div>
          </div>
        )}

        <div className="h-2" />
      </ScrollArea>

      {/* Footer actions */}
      <div className="p-3 border-t border-border/60 bg-background/95 backdrop-blur flex items-center justify-between">
        {isGroup ? (
          <>
            <Button variant="outline" onClick={onRequestAddMembers}>
              <UserPlus2 className="w-4 h-4 mr-2" />
              Add members
            </Button>
            <Button variant="destructive" onClick={onRequestLeave}>
              <LogOut className="w-4 h-4 mr-2" />
              Leave group
            </Button>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">No group actions available</div>
        )}
      </div>
    </div>
  );
}
