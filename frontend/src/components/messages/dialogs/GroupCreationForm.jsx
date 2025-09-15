"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";

function GroupCreationForm({
  groupName,
  setGroupName,
  selectedUsers = [],
  onRemoveUser,
}) {
  return (
    <div className="space-y-4">
      {/* Group Name Input */}
      <Input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Enter group name"
        className="text-sm rounded-lg border border-border/50 focus:ring-2 focus:ring-primary shadow-sm"
      />

      {/* Selected Users */}
      <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
        {selectedUsers.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-6">
            <Users className="h-4 w-4" />
            <span>No members selected yet</span>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {selectedUsers.map((u) => (
              <li
                key={u.id}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-background border shadow-sm hover:shadow-md transition"
              >
                <Avatar className="h-6 w-6 border">
                  <AvatarImage src={u.avatar || undefined} />
                  <AvatarFallback className="text-[10px] font-medium">
                    {(u.name || u.username || "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{u.name || u.username}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveUser?.(u)}
                  className="h-6 w-6 rounded-full hover:bg-red-100 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(GroupCreationForm);
