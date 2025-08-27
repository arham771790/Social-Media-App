// src/components/messages/dialogs/UserSearchResults.jsx
"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare } from "lucide-react";

export default function UserSearchResults({
  users = [],
  loading = false,
  error = null,
  selectedUsers = [],
  groupMode = false,
  onUserSelect,
  onStartDM,
  busyId,
}) {
  if (loading) {
    return (
      <ul className="divide-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              <div className="h-3 w-44 bg-muted animate-pulse rounded mt-1" />
            </div>
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  if (!users.length) {
    return <div className="p-4 text-sm text-muted-foreground">No users found.</div>;
  }

  return (
    <ul className="divide-y">
      {users.map((u) => {
        const picked = selectedUsers.some((x) => x.id === u.id);
        return (
          <li key={u.id} className="px-4 py-3 flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={u.avatar || undefined} />
              <AvatarFallback>{u.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">@{u.username}</div>
              {u.bio ? (
                <div className="text-xs text-muted-foreground truncate">{u.bio}</div>
              ) : null}
            </div>

            {groupMode ? (
              <input
                type="checkbox"
                className="h-4 w-4"
                onChange={() => onUserSelect?.(u)}
                checked={picked}
              />
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onStartDM?.(u.id)}
                disabled={busyId === u.id}
                className="gap-2"
              >
                {busyId === u.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                Message
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
