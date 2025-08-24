// src/store/socialStore.js
'use client';
import { create } from 'zustand';
import api from '@/lib/axios';

export const useSocialStore = create((set, get) => ({
  followersByUser: {},   // { [userId]: { items: [], page, limit, total, isLoading } }
  followingByUser: {},   // same shape
  followPending: {},     // { [userId]: boolean }
  requestsIncoming: { items: [], page: 1, limit: 20, total: 0, isLoading: false },
  requestsOutgoing: { items: [], page: 1, limit: 20, total: 0, isLoading: false },
  error: null,

  // --- FOLLOW / UNFOLLOW ---
  followUser: async (userId) => {
    set(s => ({ followPending: { ...s.followPending, [userId]: true } }));
    try {
      const { data } = await api.post(`/social/users/${userId}/follow`);
      // data: { status: 'ACCEPTED'|'PENDING', isFollowing, isPending }
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
    // refresh incoming
    await get().getFollowRequests('incoming', { page: 1, limit: 20 });
  },

  declineFollowRequest: async (followerId) => {
    await api.post(`/social/requests/${followerId}/decline`);
    // refresh incoming
    await get().getFollowRequests('incoming', { page: 1, limit: 20 });
  },
}));
