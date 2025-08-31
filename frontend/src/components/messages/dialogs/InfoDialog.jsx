"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";
import InfoPanel from "@/components/messages/InfoPanel";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import AddMembersDialog from "@/components/messages/dialogs/AddMembersDialog";
import { useMessageStore } from "@/store/messageStore";
import { useAuthStore } from "@/store/authStore";

export default function InfoDialog({ open, onOpenChange, thread }) {
  const meId = useAuthStore((s) => s.user?.id);
  const { removeGroupMemberAction, leaveGroupAction } = useMessageStore();

  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState(null);

  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  if (!thread) return null;

  const isGroup = thread.type === "GROUP";
  const isAdmin =
    isGroup &&
    Array.isArray(thread.adminIds) &&
    thread.adminIds.includes(meId);

  // handlers
  const requestRemove = (memberId) => {
    setRemoveTargetId(memberId);
    setConfirmRemoveOpen(true);
  };

  const confirmRemove = async () => {
    if (!removeTargetId) return;
    try {
      await removeGroupMemberAction(thread.id, removeTargetId);
      setConfirmRemoveOpen(false);
      setRemoveTargetId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const requestLeave = () => setConfirmLeaveOpen(true);

  const confirmLeave = async () => {
    try {
      if (typeof leaveGroupAction === "function") {
        await leaveGroupAction(thread.id);
      } else {
        // fallback: self-removal via same route (works with backend change)
        await removeGroupMemberAction(thread.id, meId);
      }
      setConfirmLeaveOpen(false);
      onOpenChange?.(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg !bg-white/80 backdrop-blur-lg border-border/50 shadow-2xl p-0 overflow-hidden">
          

          <div className="h-[70vh]">
            <InfoPanel
              thread={thread}
              onClose={() => onOpenChange?.(false)}
              onRequestAddMembers={() => setAddOpen(true)}
              onRequestRemove={requestRemove}
              onRequestLeave={requestLeave}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove member confirm */}
      <ConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title="Remove member?"
        description="This member will be removed from the group."
        confirmText="Remove"
        confirmVariant="destructive"
        onConfirm={confirmRemove}
      />

      {/* Leave group confirm */}
      <ConfirmDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title="Leave this group?"
        description="You will no longer receive messages from this group."
        confirmText="Leave group"
        confirmVariant="destructive"
        onConfirm={confirmLeave}
      />

      {/* Add members dialog */}
      {isGroup && isAdmin && (
        <AddMembersDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          chatGroupId={thread.id}
          existingMembers={thread.members}
        />
      )}
    </>
  );
}
