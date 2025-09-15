"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, CirclePlus } from "lucide-react";

function Row({
  user,
  groupMode,
  selected,
  onUserSelect,
  onStartDM,
  busy,
}) {
  const isSelected = !!selected?.find((u) => u.id === user.id);

  return (
    <li className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback>{(user.name || user.username || "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{user.name || user.username}</div>
          <div className="text-xs text-muted-foreground truncate">@{user.username || user.id}</div>
        </div>
      </div>

      {groupMode ? (
        <Button
          variant={isSelected ? "secondary" : "outline"}
          size="sm"
          onClick={() => onUserSelect?.(user)}
          className="shrink-0"
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Selected
            </>
          ) : (
            <>
              <CirclePlus className="w-4 h-4 mr-1" />
              Add
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => onStartDM?.(user.id)}
          disabled={busy}
          className="shrink-0"
        >
          Start chat
        </Button>
      )}
    </li>
  );
}

function UserSearchResults({
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
      <ul className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        {String(error)}
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No users found.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {users.map((u) => (
        <Row
          key={u.id}
          user={u}
          groupMode={groupMode}
          selected={selectedUsers}
          onUserSelect={onUserSelect}
          onStartDM={onStartDM}
          busy={busyId === u.id}
        />
      ))}
    </ul>
  );
}

export default memo(UserSearchResults);
