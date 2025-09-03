// src/store/socialStore.js
'use client';
import { create } from 'zustand';
import api from '@/lib/axios';

export const useSocialStore = create((set, get) => ({
  // ------------------------------
  // Follow / Following / Requests
  // ------------------------------
  followersByUser: {},   // { [userId]: { items: [], page, limit, total, isLoading } }
  followingByUser: {},   // same shape
  followPending: {},     // { [userId]: boolean }
  storiesByUser: {},
  requestsIncoming: { items: [], page: 1, limit: 20, total: 0, isLoading: false },
  requestsOutgoing: { items: [], page: 1, limit: 20, total: 0, isLoading: false },
  error: null,

  // --- FOLLOW / UNFOLLOW ---
  followUser: async (userId) => {
    set(s => ({ followPending: { ...s.followPending, [userId]: true } }));
    try {
      const { data } = await api.post(`/social/users/${userId}/follow`);
      // { status: 'ACCEPTED'|'PENDING', isFollowing, isPending }
      return data;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to follow';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set(s => ({ followPending: { ...s.followPending, [userId]: false } }));
    }
  },

  unfollowUser: async (userId) => {
    set(s => ({ followPending: { ...s.followPending, [userId]: true } }));
    try {
      await api.delete(`/social/users/${userId}/unfollow`);
      return true;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to unfollow';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set(s => ({ followPending: { ...s.followPending, [userId]: false } }));
    }
  },

  // --- LISTS ---
  getFollowers: async (userId, { page = 1, limit = 20 } = {}) => {
    set(s => ({
      followersByUser: {
        ...s.followersByUser,
        [userId]: { ...(s.followersByUser[userId] || {}), isLoading: true }
      }
    }));
    try {
      const { data } = await api.get(`/social/users/${userId}/followers`, { params: { page, limit } });
      set(s => ({
        followersByUser: {
          ...s.followersByUser,
          [userId]: {
            items: data.followers || [],
            page,
            limit,
            total: data.pagination?.total || 0,
            isLoading: false
          }
        }
      }));
      return data;
    } catch (e) {
      set(s => ({
        followersByUser: { 
          ...s.followersByUser, 
          [userId]: { ...(s.followersByUser[userId] || {}), isLoading: false } 
        },
        error: e?.response?.data?.error || 'Failed to load followers'
      }));
      throw e;
    }
  },

  getFollowing: async (userId, { page = 1, limit = 20 } = {}) => {
    set(s => ({
      followingByUser: {
        ...s.followingByUser,
        [userId]: { ...(s.followingByUser[userId] || {}), isLoading: true }
      }
    }));
    try {
      const { data } = await api.get(`/social/users/${userId}/following`, { params: { page, limit } });
      set(s => ({
        followingByUser: {
          ...s.followingByUser,
          [userId]: {
            items: data.following || [],
            page,
            limit,
            total: data.pagination?.total || 0,
            isLoading: false
          }
        }
      }));
      return data;
    } catch (e) {
      set(s => ({
        followingByUser: { 
          ...s.followingByUser, 
          [userId]: { ...(s.followingByUser[userId] || {}), isLoading: false } 
        },
        error: e?.response?.data?.error || 'Failed to load following'
      }));
      throw e;
    }
  },

  // --- REQUESTS (for private accounts) ---
  getFollowRequests: async (direction = 'incoming', { page = 1, limit = 20 } = {}) => {
    const key = direction === 'outgoing' ? 'requestsOutgoing' : 'requestsIncoming';
    set(s => ({ [key]: { ...(s[key] || {}), isLoading: true } }));
    try {
      const { data } = await api.get('/social/requests', { params: { direction, page, limit } });
      set({
        [key]: {
          items: data.items || [],
          page,
          limit,
          total: data.pagination?.total || 0,
          isLoading: false
        }
      });
      return data;
    } catch (e) {
      set(s => ({
        [key]: { ...(s[key] || {}), isLoading: false },
        error: e?.response?.data?.error || 'Failed to load requests'
      }));
      throw e;
    }
  },

  acceptFollowRequest: async (followerId) => {
    await api.post(`/social/requests/${followerId}/accept`);
    await get().getFollowRequests('incoming', { page: 1, limit: 20 });
  },

  declineFollowRequest: async (followerId) => {
    await api.post(`/social/requests/${followerId}/decline`);
    await get().getFollowRequests('incoming', { page: 1, limit: 20 });
  },

  // ------------------------------
  // Contacts (optional)
  // ------------------------------
  addContact: async (id) => {
    try {
      const { data } = await api.post(`/social/contacts/${id}`);
      return data;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to add contact';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  getContacts: async () => {
    try {
      const { data } = await api.get('/social/contacts');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to get contacts';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  // ======================================================
  // STORIES
  // ======================================================
  // Cache keyed by "public" and userId:
  // storiesByUser: { public: { items, isLoading, error }, [userId]: { items, isLoading, error } }
  storiesByUser: {},

  // Get public stories feed
  fetchPublicStories: async () => {
    set(s => ({
      storiesByUser: {
        ...s.storiesByUser,
        public: { ...(s.storiesByUser.public || {}), isLoading: true, error: null }
      }
    }));
    try {
      const { data } = await api.get('/social/stories'); // GET /stories (no id) => public
      set(s => ({
        storiesByUser: {
          ...s.storiesByUser,
          public: { items: Array.isArray(data) ? data : [], isLoading: false, error: null }
        }
      }));
      return data;
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to load stories';
      set(s => ({
        storiesByUser: {
          ...s.storiesByUser,
          public: { ...(s.storiesByUser.public || {}), isLoading: false, error: err }
        }
      }));
      throw e;
    }
  },

  // Get stories for a specific user
  fetchUserStories: async (userId) => {
    if (!userId) return [];
    set(s => ({
      storiesByUser: {
        ...s.storiesByUser,
        [userId]: { ...(s.storiesByUser[userId] || {}), isLoading: true, error: null }
      }
    }));
    try {
      const { data } = await api.get(`/social/stories/${userId}`);
      set(s => ({
        storiesByUser: {
          ...s.storiesByUser,
          [userId]: { items: Array.isArray(data) ? data : [], isLoading: false, error: null }
        }
      }));
      return data;
    } catch (e) {
      const err = e?.response?.data?.error || 'Failed to load user stories';
      set(s => ({
        storiesByUser: {
          ...s.storiesByUser,
          [userId]: { ...(s.storiesByUser[userId] || {}), isLoading: false, error: err }
        }
      }));
      throw e;
    }
  },

  createStory: async ({ mediaUrl, type, caption, isPublic = true }) => {
    try {
      const { data: story } = await api.post('/social/stories', { mediaUrl, type, caption, isPublic });

      set(s => {
        const next = { ...s.storiesByUser };
        if (story?.isPublic && next.public?.items) {
          next.public = { ...next.public, items: [story, ...(next.public.items || [])] };
        }
        const uid = story?.userId;
        if (uid && next[uid]?.items) {
          next[uid] = { ...next[uid], items: [story, ...(next[uid].items || [])] };
        }
        return { storiesByUser: next };
      });

      return story;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to create story';
      set({ error: msg });
      throw new Error(msg);
    }
  },
  deleteStory: async (storyId) => {
    await api.delete(`/social/stories/${storyId}`);
    set(s => {
      const next = { ...s.storiesByUser };
      for (const k of Object.keys(next)) {
        if (Array.isArray(next[k]?.items)) {
          next[k].items = next[k].items.filter(st => st.id !== storyId);
        }
      }
      return { storiesByUser: next };
    });
    return true;
  },
  
    discover: {
      suggestions: [],                     // always an array
      trending: [],                        // always an array
      loading: { suggestions: false, trending: false },
      error: null,
    },

  // Fetch people suggestions
  fetchSuggestions: async (limit = 6) => {
    set((s) => ({
      discover: {
        ...s.discover,
        loading: { ...s.discover.loading, suggestions: true },
        error: null,
      },
    }));
    try {
      const { data } = await api.get('/discover/suggestions', { params: { limit } });
      // Normalize: accept either {items: []} or [] directly
      const items =
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data)        ? data :
        [];
      set((s) => ({
        discover: {
          ...s.discover,
          suggestions: items,
          loading: { ...s.discover.loading, suggestions: false },
          error: null,
        },
      }));
      return items;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to load suggestions';
      set((s) => ({
        discover: {
          ...s.discover,
          suggestions: [],
          loading: { ...s.discover.loading, suggestions: false },
          error: msg,
        },
      }));
      throw e;
    }
  },

  // Fetch trending tags
  fetchTrending: async (limit = 10) => {
    set((s) => ({
      discover: {
        ...s.discover,
        loading: { ...s.discover.loading, trending: true },
        error: null,
      },
    }));
    try {
      const { data } = await api.get('/discover/trending', { params: { limit } });
      const items =
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data)        ? data :
        [];
      set((s) => ({
        discover: {
          ...s.discover,
          trending: items,
          loading: { ...s.discover.loading, trending: false },
          error: null,
        },
      }));
      return items;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to load trending';
      set((s) => ({
        discover: {
          ...s.discover,
          trending: [],
          loading: { ...s.discover.loading, trending: false },
          error: msg,
        },
      }));
      throw e;
    }
  },
   discoverPaged: {
    items: [],           // current page items (or accumulated, see below)
    total: 0,            // total items across pages (if backend sends it)
    page: 1,
    limit: 24,
    hasMore: true,
    isLoading: false,
    q: '',               // current query string used to fetch
    error: null,
  },

  clearSuggestionsPaged: () =>
    set((s) => ({
      discoverPaged: {
        ...s.discoverPaged,
        items: [],
        total: 0,
        page: 1,
        hasMore: true,
        isLoading: false,
        error: null,
      },
    })),

  /**
   * Fetch suggestions with pagination.
   * Accepts either:
   *   - { page, limit, q } for page-based pagination
   *   - Or you can pass only { q } and it will use the current page/limit from state.
   *
   * Backend expected: GET /discover/suggestions?page=1&limit=24&q=foo
   * Response can be:
   *   { items: [...], total: 123, page: 1, limit: 24 }
   * OR a plain array: [...]
   */
  fetchSuggestionsPaged: async ({ page, limit, q } = {}) => {
    const st = get().discoverPaged;

    const nextQ     = typeof q === 'string' ? q : st.q;
    const nextPage  = Number.isFinite(page) ? page : st.page || 1;
    const nextLimit = Number.isFinite(limit) ? limit : st.limit || 24;

    // If the query changed, reset before loading
    if (nextQ !== st.q && (nextPage === 1 || !page)) {
      set((s) => ({
        discoverPaged: {
          ...s.discoverPaged,
          items: [],
          total: 0,
          page: 1,
          hasMore: true,
          isLoading: false,
          error: null,
          q: nextQ,
        },
      }));
    }

    set((s) => ({
      discoverPaged: {
        ...s.discoverPaged,
        isLoading: true,
        error: null,
        q: nextQ,
      },
    }));

    try {
      const { data } = await api.get('/discover/suggestions', {
        params: { page: nextPage, limit: nextLimit, q: nextQ || undefined },
      });

      const payload = Array.isArray(data)
        ? { items: data, total: undefined, page: nextPage, limit: nextLimit }
        : {
            items: Array.isArray(data?.items) ? data.items : [],
            total: data?.total,
            page: Number.isFinite(data?.page) ? data.page : nextPage,
            limit: Number.isFinite(data?.limit) ? data.limit : nextLimit,
          };

      // If page === 1, replace; else append
      set((s) => {
        const prevItems = s.discoverPaged.items || [];
        const merged =
          payload.page > 1 ? [...prevItems, ...payload.items] : payload.items;

        const totalKnown = typeof payload.total === 'number' ? payload.total : merged.length;
        const hasMore =
          typeof payload.total === 'number'
            ? merged.length < payload.total
            : payload.items.length === nextLimit; // heuristic if total not provided

        return {
          discoverPaged: {
            ...s.discoverPaged,
            items: merged,
            total: totalKnown,
            page: payload.page,
            limit: payload.limit,
            hasMore,
            isLoading: false,
            error: null,
            q: nextQ,
          },
        };
      });

      return payload;
    } catch (e) {
      const msg = e?.response?.data?.error || 'Failed to load people';
      set((s) => ({
        discoverPaged: {
          ...s.discoverPaged,
          isLoading: false,
          error: msg,
        },
      }));
      throw e;
    }
  },
  explore: {
    items: [],
    total: 0,
    page: 1,
    limit: 24,
    sort: "trending", // 'trending' | 'recent' | 'top'
    q: "",
    tag: "",
    loading: false,
    error: null,
    tagsTop: [],
    tagsLoading: false,
  },

  fetchExplore: async ({ page = 1, limit = 24, sort = "trending", q = "", tag = "" } = {}) => {
    set((s) => ({ explore: { ...s.explore, loading: true, error: null } }));
    try {
      const params = { page, limit, sort };
      if (q) params.q = q;
      if (tag) params.tag = tag;

      const { data } = await api.get("/explore", { params });
      set((s) => ({
        explore: {
          ...s.explore,
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total || 0,
          page: data?.page || page,
          limit: data?.limit || limit,
          sort,
          q,
          tag,
          loading: false,
          error: null,
        },
      }));
    } catch (e) {
      set((s) => ({ explore: { ...s.explore, loading: false, error: "Failed to load explore" } }));
      throw e;
    }
  },

  fetchTopTags: async (limit = 20) => {
    set((s) => ({ explore: { ...s.explore, tagsLoading: true } }));
    try {
      const { data } = await api.get("/explore/tags", { params: { limit } });
      set((s) => ({ explore: { ...s.explore, tagsTop: Array.isArray(data) ? data : [], tagsLoading: false } }));
    } catch {
      set((s) => ({ explore: { ...s.explore, tagsTop: [], tagsLoading: false } }));
    }
  },

  fetchTagFeed: async ({ tag, page = 1, limit = 24 }) => {
    if (!tag) return { items: [], total: 0, page, limit };
    set((s) => ({ explore: { ...s.explore, loading: true, error: null } }));
    try {
      const { data } = await api.get(`/explore/tags/${encodeURIComponent(tag)}`, { params: { page, limit } });
      set((s) => ({
        explore: {
          ...s.explore,
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total || 0,
          page: data?.page || page,
          limit: data?.limit || limit,
          tag: data?.tag || tag,
          q: "",
          loading: false,
          error: null,
        },
      }));
      return data;
    } catch (e) {
      set((s) => ({ explore: { ...s.explore, loading: false, error: "Failed to load tag feed" } }));
      throw e;
    }
  },

  searchTags: async (q) => {
    if (!q?.trim()) return [];
    const { data } = await api.get("/explore/tags/search", { params: { q } });
    return Array.isArray(data) ? data : [];
  },
}));


  
