"use client";
/**
 * Auth Store
 * - Handles register, login, logout, forgot/reset password
 * - Persists token + user to localStorage + Cookies (for Middleware)
 * - Interceptor (in src/lib/axios.ts) attaches token & redirects on 401
 */
import { create } from "zustand";
import api from "@/lib/axios";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Load from localStorage on app start (sync with cookies for Middleware)
  hydrate: () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = userStr ? JSON.parse(userStr) : null;
      
      // Sync cookie if token exists in localStorage but not in cookie (e.g. fresh session)
      if (token && typeof document !== 'undefined' && !document.cookie.includes('token=')) {
        document.cookie = `token=${token}; path=/; max-age=604800; samesite=lax`;
      }

      set({
        token,
        user,
        isAuthenticated: !!token && !!user,
        error: null,
      });
    } catch {
      // noop
    }
  },

  requestEmailVerification: async (email) => {
    try {
      const { data } = await api.post("/auth/verify-email/request", { email });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to send code";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  confirmEmailVerification: async ({ email, code }) => {
    try {
      const { data } = await api.post("/auth/verify-email/confirm", { email, code });
      const token = data?.verifyToken || data?.token || data?.data?.verifyToken;
      if (!token) throw new Error("Verification failed");
      return token;
    } catch (err) {
      const msg = err?.response?.data?.error || "Invalid or expired code";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  registerVerified: async ({ username, email, password, verifyToken }) => {
    try {
      const { data } = await api.post("/auth/register", {
        username,
        email,
        password,
        verifyToken,
      });

      if (data?.token && data?.user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          document.cookie = `token=${data.token}; path=/; max-age=604800; samesite=lax`;
        }
        set({
          token: data.token,
          user: data.user,
          isAuthenticated: true,
          error: null,
        });
      }
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Registration failed";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  register: async ({ username, email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/register", { username, email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; samesite=lax`;
      }
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      const msg = err?.response?.data?.error || "Registration failed";
      set({ error: msg, isLoading: false, isAuthenticated: false });
      throw new Error(msg);
    }
  },

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; samesite=lax`;
      }
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data.user;
    } catch (err) {
      const msg = err?.response?.data?.error || "Login failed";
      set({ error: msg, isLoading: false, isAuthenticated: false });
      throw new Error(msg);
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      set({ isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to send OTP";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/reset-password", { email, otp, newPassword });
      set({ isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to reset password";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  checkAuth: async () => {
    // If no token in memory, try to hydrate first
    if (!get().token && typeof window !== 'undefined') {
       const token = localStorage.getItem('token');
       if (!token) {
         set({ isAuthenticated: false, isLoading: false });
         return null;
       }
    }

    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/users/me");
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data));
      }
      set({ user: data, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load profile";
      // Clear token and user if /me fails (invalid session)
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        error: msg, 
        isLoading: false 
      });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore if logout fails (token might be expired)
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
}));
