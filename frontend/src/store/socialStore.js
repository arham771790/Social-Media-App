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
}));