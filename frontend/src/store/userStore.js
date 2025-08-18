// src/store/userStore.js
"use client";
/**
 * User Store (matches /user router)
 * - Me:        GET/PUT /user/me
 * - Settings:  GET/PUT /user/me/settings
 * - Search:    GET     /user/search
 * - Public:    GET     /user/:id
 */
import { create } from "zustand";
import api from "@/lib/axios";

export const useUserStore = create((set, get) => ({
  me: null,
  selectedUser: null,
  searchResults: [],
  searchPagination: { page: 1, limit: 20, total: 0, pages: 0 },

  settings: null,
  isLoading: false,
  error: null,

  /* ---------- ME ---------- */
  fetchMe: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/user/me");
      set({ me: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to fetch profile";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateMe: async (payload) => {
    // backend accepts: { avatar?, bio?, isPublic? }
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put("/user/me", payload);
      set((s) => ({ me: { ...(s.me || {}), ...data }, isLoading: false }));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to update profile";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /* ---------- PUBLIC USER ---------- */
  fetchUserById: async (id) => {
    if (!id) return null;
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/user/${id}`);
      // data includes: id, username, avatar, bio, isPublic, _count{followers,following,posts}, followStatus, isOnline, lastSeen
      set({ selectedUser: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load user";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // Resolve username -> id via /user/search, then fetch profile
  getIdByUsername: async (username) => {
    if (!username) return null;
    const res = await get().searchUsers({ q: username, page: 1, limit: 1 });
    return res?.users?.[0]?.id || null;
  },

  fetchUserByUsername: async (username) => {
    const id = await get().getIdByUsername(username);
    if (!id) throw new Error("User not found");
    return get().fetchUserById(id);
  },

  resetSelectedUser: () => set({ selectedUser: null }),

  /* ---------- SEARCH USERS ---------- */
  searchUsers: async ({ q, page = 1, limit = 20 }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/user/search`, { params: { q, page, limit } });
      set({
        searchResults: data.users || [],
        searchPagination: data.pagination || { page, limit, total: 0, pages: 0 },
        isLoading: false,
      });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Search failed";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /* ---------- SETTINGS ---------- */
  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/user/me/settings");
      set({ settings: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load settings";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateSettings: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put("/user/me/settings", payload);
      set({ settings: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to update settings";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
}));
