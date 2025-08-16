"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function EditPostDialog({ open, onOpenChange, post, onSave, saving = false }) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    isPublic: true,
  });

  useEffect(() => {
    if (!post) return;
    setForm({
      title: post.title || "",
      content: post.content || "",
      isPublic: post.isPublic ?? true,
    });
  }, [post]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Optional title"
              className="bg-gray-800 border-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Say something..."
              rows={4}
              className="bg-gray-800 border-gray-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="public">Public</Label>
            <Switch
              id="public"
              checked={form.isPublic}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isPublic: v }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
