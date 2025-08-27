// src/components/messages/dialogs/GroupCreationForm.jsx
"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function GroupCreationForm({
  groupName,
  setGroupName,
  selectedUsers = [],
  onRemoveUser,
}) {
  return (
    <div className="space-y-3">
      <Input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name"
      />

      {!!selectedUsers.length && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="px-2 py-0.5 rounded-full bg-muted text-sm inline-flex items-center gap-1"
            >
              @{u.username}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onRemoveUser?.(u)}
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
