"use client";
import { create } from "zustand";
import api from "@/lib/axios";

export const useFeedStore = create((set, get) => ({
  home: [],
  explore: [],
  pagination: { home: {}, explore: {} },
  isLoading: false,
  error: null,

  // Fetch authenticated home feed
  fetchHome: async ({ page = 1, limit = 10 } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/feed?page=${page}&limit=${limit}`);
      set({
        home: page === 1 ? data.posts : [...get().home, ...data.posts],
        pagination: { ...get().pagination, home: data.pagination },
        isLoading: false
      });
      return data.posts;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load home feed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // Fetch public explore feed
  fetchExplore: async ({ page = 1, limit = 12, tag = "" } = {}) => {
    set({ isLoading: true, error: null });
    try {
      const q = `page=${page}&limit=${limit}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
      const { data } = await api.get(`/posts/explore?${q}`);
      set({
        explore: page === 1 ? data.posts : [...get().explore, ...data.posts],
        pagination: { ...get().pagination, explore: data.pagination },
        isLoading: false
      });
      return data.posts;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load explore feed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
  // Inside create(...) object of useFeedStore
patchAuthorFollow: (authorId, patch) =>
  set((s) => ({
    home: s.home.map((p) =>
      p.author?.id === authorId
        ? {
            ...p,
            author: {
              ...p.author,
              // for convenience in UI
              isFollowing: patch.isFollowing ?? p.author.isFollowing,
              isPending: patch.isPending ?? p.author.isPending,
            },
          }
        : p
    ),
  })),

  // Optional helper for optimistic like/bookmark updates
  patchFeedItem: (postId, patch) => {
    set({
      home: get().home.map(p => p.id === postId ? { ...p, ...patch } : p),
      explore: get().explore.map(p => p.id === postId ? { ...p, ...patch } : p),
    });
  },

  reset: () => set({ home: [], explore: [], pagination: { home: {}, explore: {} }, error: null, isLoading: false })
}));
