"use client";

import { memo } from "react";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, UserPlus, X, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useMessageStore } from "@/store/messageStore";
import { useShallow } from "zustand/react/shallow";

const InfoPanel = memo(function InfoPanel({
  thread,
  onClose,
  onRequestAddMembers,   // () => void
  onRequestRemove,       // (memberId) => void
  onRequestLeave,        // () => void
}) {
  const meId = useAuthStore((s) => s.user?.id);
  const { groupBusyById } = useMessageStore(
    useShallow((s) => ({
      groupBusyById: s.groupBusyById,
    }))
  );

  if (!thread) return null;
  const busy = !!groupBusyById[thread.id];

  const isAdmin =
    thread.type === "GROUP" &&
    Array.isArray(thread.adminIds) &&
    thread.adminIds.includes(meId);

  return (
    <aside className="h-full flex flex-col w-full md:w-72 lg:w-80 border-l border-border bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div>
          <h3 className="font-semibold text-sm">Chat Info</h3>
          <p className="text-xs text-muted-foreground">
            {thread.type === "GROUP" ? "Group" : "Direct"}
          </p>
        </div>
        {onClose && (
          <Button
            size="icon"
            variant="ghost"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 p-4">
        {/* Group details */}
        {thread.type === "GROUP" && (
          <div className="mb-6">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Group
            </h4>
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 ring-1 ring-border/50">
                <AvatarImage src={thread.avatar || undefined} />
                <AvatarFallback>
                  {thread.name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{thread.name}</div>
                <div className="text-xs text-muted-foreground">
                  {thread.members?.length || 0} members
                </div>
              </div>
            </div>

            {/* Add members */}
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-1.5"
                disabled={busy}
                onClick={onRequestAddMembers}
              >
                <UserPlus className="h-4 w-4" />
                Add members
              </Button>
            )}
          </div>
        )}

        {/* Members list */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            Members
          </h4>
          <ul className="space-y-2.5">
            {thread.members?.map((m) => (
              <li key={m.id} className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 ring-1 ring-border/50">
                  <AvatarImage src={m.avatar || undefined} />
                  <AvatarFallback>
                    {m.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/u/${m.username}`}
                    className="text-sm hover:underline truncate block"
                    title={`@${m.username}`}
                  >
                    @{m.username}
                  </Link>
                </div>

                {isAdmin && String(m.id) !== String(meId) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Remove member"
                    disabled={busy}
                    onClick={() => onRequestRemove?.(m.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Leave group (for everyone) */}
        {thread.type === "GROUP" && (
          <div className="mt-6">
            <Button
              variant="destructive"
              className="w-full gap-1.5"
              disabled={busy}
              onClick={onRequestLeave}
            >
              <LogOut className="h-4 w-4" />
              Leave Group
            </Button>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
});

export default InfoPanel;
