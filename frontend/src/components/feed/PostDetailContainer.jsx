// src/components/feed/PostDetailContainer.jsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import PostCard from "./PostCard";
import PostSkeleton from "./PostSkeleton";
import { usePostStore } from "@/store/postStore";

export default function PostDetailContainer({ postId, initialPost = null }) {
  const { byId, getPost } = usePostStore();
  const cached = postId ? byId[postId] : null;

  const [post, setPost] = useState(initialPost || cached || null);
  const [loading, setLoading] = useState(!initialPost && !cached);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPost(postId); // calls /api/posts/:id
      setPost(data);
    } catch (e) {
      setError(e?.message || "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [getPost, postId]);

  useEffect(() => {
    if (!postId) return;
    if (initialPost || cached) {
      setPost(initialPost || cached);
      setLoading(false);
      return;
    }
    load();
  }, [postId, initialPost, cached, load]);

  if (!postId) return <div className="p-6 text-muted-foreground">No post id provided.</div>;
  if (loading) return <PostSkeleton />;
  if (error)
    return (
      <div className="p-6 text-center">
        <p className="text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={load}>Try again</Button>
      </div>
    );
  if (!post) return <div className="p-6 text-muted-foreground">Post not found.</div>;

  return <PostCard post={post} />;
}
