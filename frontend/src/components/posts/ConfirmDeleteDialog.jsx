"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, deleting = false }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>Delete this post?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
