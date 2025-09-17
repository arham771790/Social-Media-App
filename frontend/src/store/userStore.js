"use client";

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

  // ME
  fetchMe: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/users/me");
      set({ me: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to fetch profile";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateMe: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.put("/users/me", payload); // { avatar?, bio?, isPublic? }
      set((s) => ({ me: { ...(s.me || {}), ...data }, isLoading: false }));
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to update profile";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // PUBLIC USER
  fetchUserById: async (id) => {
    if (!id) return null;
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/users/${id}`);
      set({ selectedUser: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load user";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchUserByUsername: async (username) => {
    if (!username) return null;
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/users/username/${username}`);
      set({ selectedUser: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load user";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  resetSelectedUser: () => set({ selectedUser: null }),

  // SEARCH USERS (private users included; backend returns isPublic + followStatus)
  searchUsers: async ({ q, page = 1, limit = 20 }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/users/search`, { params: { q, page, limit } });
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

  // SETTINGS
  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/users/me/settings");
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
      const { data } = await api.put("/users/me/settings", payload);
      set({ settings: data, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to update settings";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
}));
