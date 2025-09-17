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

  // Bookmarks cache (for current user)
  // bookmarks = { items, page, limit, total, hasMore, isLoading, error }
  bookmarks: { items: [], page: 0, limit: 24, total: 0, hasMore: true, isLoading: false, error: null },

  /* ---------------------------
   * CREATE
   * ------------------------- */
  createPost: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/posts", payload);

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
      const { data } = await api.get(`/posts/${id}`);
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
      const { data } = await api.put(`/posts/${id}`, payload);

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
      await api.delete(`/posts/${id}`);

      // 1) remove from byId + current
      set((s) => {
        const next = { ...s.byId };
        delete next[id];
        return { byId: next, current: s.current?.id === id ? null : s.current };
      });

      // 2) remove from all author lists
      get()._removeFromAuthorLists(id);

      // 3) also remove from bookmarks if present
      set((s) => ({
        bookmarks: {
          ...s.bookmarks,
          items: s.bookmarks.items.filter((p) => p.id !== id),
          total: Math.max(
            0,
            s.bookmarks.total -
              (s.bookmarks.items.some((p) => p.id === id) ? 1 : 0)
          ),
        },
      }));

      // 4) remove from feed if store provides it
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
      const { data } = await api.post(`/posts/${id}/like`);

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
      const { data } = await api.post(`/posts/${id}/bookmark`); // { isBookmarked: boolean }

      // update single & current
      set((s) => ({
        byId: { ...s.byId, [id]: { ...s.byId[id], isBookmarked: data.isBookmarked } },
        current:
          s.current?.id === id ? { ...s.current, isBookmarked: data.isBookmarked } : s.current,
      }));

      // feed
      const fs = useFeedStore.getState();
      if (fs?.patchFeedItem) fs.patchFeedItem(id, { isBookmarked: data.isBookmarked });

      // author lists
      get()._patchInAuthorLists(id, { isBookmarked: data.isBookmarked });

      // sync bookmarks cache
      const s = get();
      const exists = s.bookmarks.items.some((p) => p.id === id);
      let nextItems = s.bookmarks.items;

      if (data.isBookmarked && !exists) {
        const full = s.byId[id] || fs?.getItem?.(id) || null;
        if (full) nextItems = [full, ...s.bookmarks.items];
      } else if (!data.isBookmarked && exists) {
        nextItems = s.bookmarks.items.filter((p) => p.id !== id);
      }

      set({
        bookmarks: {
          ...s.bookmarks,
          items: nextItems,
          total: data.isBookmarked
            ? s.bookmarks.total + (exists ? 0 : 1)
            : Math.max(0, s.bookmarks.total - (exists ? 1 : 0)),
        },
      });

      return data;
    } catch (err) {
      throw new Error(err?.response?.data?.error || "Failed to toggle bookmark");
    }
  },

  replyToPost: async (id, payload) => {
    try {
      const { data } = await api.post(`/posts/${id}/reply`, payload);
    /* optional: update comments count in caches here if your API returns it */
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
    // 1) /posts/by-author/:id
    // 2) /posts?author=:id
    // 3) /posts?authorId=:id
    let data;
    try {
      const r1 = await api.get(`/posts/by-author/${authorId}`, { params: { page, limit } });
      data = r1.data;
    } catch {
      try {
        const r2 = await api.get(`/posts`, { params: { author: authorId, page, limit } });
        data = r2.data;
      } catch {
        const r3 = await api.get(`/posts`, { params: { authorId, page, limit } });
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
   * Bookmarks (paginated)
   * ------------------------- */
  fetchBookmarks: async ({ page = 1, limit = 24 } = {}) => {
    const s = get();
    if (page !== 1 && !s.bookmarks.hasMore) return s.bookmarks;

    set({
      bookmarks: { ...s.bookmarks, isLoading: true, error: null, limit },
    });

    // Try likely endpoints
    let data;
    try {
      const r1 = await api.get(`/posts/bookmarks`, { params: { page, limit } });
      data = r1.data;
    } catch {
      const r2 = await api.get(`/bookmarks`, { params: { page, limit } });
      data = r2.data;
    }

    const posts = data.items || data.posts || data || [];
    const pages =
      data.pagination?.pages ??
      (data.total && limit ? Math.ceil(data.total / limit) : 1);
    const hasMore = page < pages;

    // keep single cache fresh
    const nextById = { ...get().byId };
    posts.forEach((p) => {
      if (p?.id) nextById[p.id] = p;
    });

    set((prev) => ({
      byId: nextById,
      bookmarks: {
        items: page === 1 ? posts : [...prev.bookmarks.items, ...posts],
        page,
        limit,
        total:
          data.pagination?.total ??
          (page === 1 ? posts.length : prev.bookmarks.total),
        hasMore,
        isLoading: false,
        error: null,
      },
    }));

    return get().bookmarks;
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

    // Also patch in bookmarks if present
    const bk = s.bookmarks;
    if (bk?.items?.length) {
      const i = bk.items.findIndex((p) => p.id === postId);
      if (i >= 0) {
        const next = [...bk.items];
        next[i] = { ...next[i], ...patch };
        set({ bookmarks: { ...bk, items: next } });
      }
    }
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

    // Replace in bookmarks too if present
    const bk = s.bookmarks;
    if (bk?.items?.length) {
      const i = bk.items.findIndex((p) => p.id === post.id);
      if (i >= 0) {
        const next = [...bk.items];
        next[i] = { ...next[i], ...post };
        set({ bookmarks: { ...bk, items: next } });
      }
    }
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
