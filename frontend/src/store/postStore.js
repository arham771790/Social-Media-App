// src/store/postStore.js
"use client";
import { create } from "zustand";
import api from "@/lib/axios";
import { useFeedStore } from "./feedStore";

export const usePostStore = create((set, get) => ({
  byId: {},        // { [postId]: Post }
  current: null,   // active post
  isLoading: false,
  error: null,

  // Per-author lists cache:
  // byAuthor[authorId] = { items, page, limit, total, hasMore, isLoading, error }
  byAuthor: {},

  /* ---------------------------
   * CREATE
   * ------------------------- */
  createPost: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/posts", payload);

      // put in single-post cache
      set((s) => ({ byId: { ...s.byId, [data.id]: data }, isLoading: false }));

      // if we have the author's bucket loaded, prepend
      const authorId = String(data.authorId || data.author?.id || "");
      if (authorId) {
        const bucket = get().byAuthor[authorId];
        if (bucket?.items) {
          set((s) => ({
            byAuthor: {
              ...s.byAuthor,
              [authorId]: {
                ...bucket,
                items: [data, ...bucket.items],
                total: (bucket.total || 0) + 1,
              },
            },
          }));
        }
      }

      // optional: add to feed if you support it
      const fs = useFeedStore.getState();
      if (fs?.prependToFeed) fs.prependToFeed(data);

      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to create post";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /* ---------------------------
   * READ single
   * ------------------------- */
  getPost: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/api/posts/${id}`);
      set((s) => ({
        byId: { ...s.byId, [id]: data },
        current: data,
        isLoading: false,
      }));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load post";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /* ---------------------------
   * UPDATE
   * ------------------------- */
  updatePost: async (id, payload) => {
    try {
      const { data } = await api.put(`/api/posts/${id}`, payload);

      // 1) single-post cache + current
      set((s) => ({
        byId: { ...s.byId, [id]: { ...(s.byId[id] || {}), ...data } },
        current: s.current?.id === id ? { ...s.current, ...data } : s.current,
      }));

      // 2) replace in all author lists
      get()._replaceInAuthorLists(data);

      // 3) patch feed if available
      const fs = useFeedStore.getState();
      if (fs?.patchFeedItem) fs.patchFeedItem(id, data);

      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to update post");
    }
  },

  /* ---------------------------
   * DELETE
   * ------------------------- */
  deletePost: async (id) => {
    try {
      await api.delete(`/api/posts/${id}`);

      // 1) remove from byId + current
      set((s) => {
        const next = { ...s.byId };
        delete next[id];
        return { byId: next, current: s.current?.id === id ? null : s.current };
      });

      // 2) remove from all author lists
      get()._removeFromAuthorLists(id);

      // 3) remove from feed if store provides it
      const fs = useFeedStore.getState();
      if (fs?.removeFromFeed) fs.removeFromFeed(id);
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to delete post");
    }
  },

  /* ---------------------------
   * LIKE / BOOKMARK / REPLY
   * ------------------------- */
  toggleLike: async (id) => {
    try {
      const { data } = await api.post(`/api/posts/${id}/like`);

      // single post & current
      set((s) => ({
        byId: {
          ...s.byId,
          [id]: { ...s.byId[id], isLiked: data.isLiked, likesCount: data.likesCount },
        },
        current:
          s.current?.id === id
            ? { ...s.current, isLiked: data.isLiked, likesCount: data.likesCount }
            : s.current,
      }));

      // feed
      const fs = useFeedStore.getState();
      if (fs?.patchFeedItem) fs.patchFeedItem(id, { isLiked: data.isLiked, likesCount: data.likesCount });

      // author lists
      get()._patchInAuthorLists(id, { isLiked: data.isLiked, likesCount: data.likesCount });

      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to toggle like");
    }
  },

  toggleBookmark: async (id) => {
    try {
      const { data } = await api.post(`/api/posts/${id}/bookmark`);
      set((s) => ({
        byId: { ...s.byId, [id]: { ...s.byId[id], isBookmarked: data.isBookmarked } },
        current:
          s.current?.id === id ? { ...s.current, isBookmarked: data.isBookmarked } : s.current,
      }));

      const fs = useFeedStore.getState();
      if (fs?.patchFeedItem) fs.patchFeedItem(id, { isBookmarked: data.isBookmarked });

      get()._patchInAuthorLists(id, { isBookmarked: data.isBookmarked });

      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to toggle bookmark");
    }
  },

  replyToPost: async (id, payload) => {
    try {
      const { data } = await api.post(`/api/posts/${id}/reply`, payload);
      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to reply");
    }
  },

  /* ---------------------------
   * LIST: by author
   * ------------------------- */
  fetchByAuthor: async (authorId, { page = 1, limit = 24 } = {}) => {
    const key = String(authorId);
    const bucket = get().byAuthor[key] || {
      items: [],
      page: 0,
      limit,
      total: 0,
      hasMore: true,
      isLoading: false,
      error: null,
    };

    if (page !== 1 && !bucket.hasMore) return bucket;

    set((s) => ({
      byAuthor: {
        ...s.byAuthor,
        [key]: { ...bucket, isLoading: true, error: null },
      },
    }));

    // Try 3 shapes:
    // 1) /api/posts/by-author/:id
    // 2) /api/posts?author=:id
    // 3) /api/posts?authorId=:id
    let data;
    try {
      const r1 = await api.get(`/api/posts/by-author/${authorId}`, { params: { page, limit } });
      data = r1.data;
    } catch {
      try {
        const r2 = await api.get(`/api/posts`, { params: { author: authorId, page, limit } });
        data = r2.data;
      } catch {
        const r3 = await api.get(`/api/posts`, { params: { authorId, page, limit } });
        data = r3.data;
      }
    }

    const posts = data.posts || data; // support both shapes
    const pages = data.pagination?.pages ?? 1;
    const hasMore = page < pages;

    // keep single-post cache fresh
    const nextById = { ...get().byId };
    posts.forEach((p) => {
      nextById[p.id] = p;
    });

    set((s) => ({
      byId: nextById,
      byAuthor: {
        ...s.byAuthor,
        [key]: {
          items: page === 1 ? posts : [...(s.byAuthor[key]?.items || []), ...posts],
          page,
          limit,
          total:
            data.pagination?.total ||
            (page === 1 ? posts.length : (s.byAuthor[key]?.total || 0)),
          hasMore,
          isLoading: false,
          error: null,
        },
      },
    }));

    return get().byAuthor[key];
  },

  resetAuthorList: (authorId) => {
    const key = String(authorId);
    set((s) => {
      const next = { ...s.byAuthor };
      delete next[key];
      return { byAuthor: next };
    });
  },

  /* ---------------------------
   * Helpers for keeping lists in sync
   * ------------------------- */
  _patchInAuthorLists: (postId, patch) => {
    const s = get();
    const byAuthor = { ...s.byAuthor };
    Object.keys(byAuthor).forEach((k) => {
      const bucket = byAuthor[k];
      if (!bucket?.items?.length) return;
      const idx = bucket.items.findIndex((p) => p.id === postId);
      if (idx >= 0) {
        const updated = { ...bucket.items[idx], ...patch };
        byAuthor[k] = {
          ...bucket,
          items: [
            ...bucket.items.slice(0, idx),
            updated,
            ...bucket.items.slice(idx + 1),
          ],
        };
      }
    });
    set({ byAuthor });
  },

  _replaceInAuthorLists: (post) => {
    if (!post?.id) return;
    const s = get();
    const byAuthor = { ...s.byAuthor };
    Object.keys(byAuthor).forEach((k) => {
      const bucket = byAuthor[k];
      if (!bucket?.items?.length) return;
      const idx = bucket.items.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        byAuthor[k] = {
          ...bucket,
          items: [
            ...bucket.items.slice(0, idx),
            { ...bucket.items[idx], ...post },
            ...bucket.items.slice(idx + 1),
          ],
        };
      }
    });
    set({ byAuthor });
  },

  _removeFromAuthorLists: (postId) => {
    const s = get();
    const byAuthor = { ...s.byAuthor };
    Object.keys(byAuthor).forEach((k) => {
      const bucket = byAuthor[k];
      if (!bucket?.items?.length) return;
      const filtered = bucket.items.filter((p) => p.id !== postId);
      if (filtered.length !== bucket.items.length) {
        byAuthor[k] = {
          ...bucket,
          items: filtered,
          total: Math.max(0, (bucket.total || bucket.items.length) - 1),
        };
      }
    });
    set({ byAuthor });
  },
}));
