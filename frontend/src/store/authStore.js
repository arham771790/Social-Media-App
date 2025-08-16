"use client";
/**
 * Auth Store
 * - Handles register, login, logout, forgot/reset password
 * - Persists token + user to localStorage
 * - Interceptor (in src/lib/axios.js) attaches token & redirects on 401
 */
import { create } from "zustand";
import api from "@/lib/axios";

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Load from localStorage on app start (call in layout)
  hydrate: () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      const user = userStr ? JSON.parse(userStr) : null;
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

  // Auth — Register
  register: async ({ username, email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/register", { username, email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
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

  // Auth — Login
  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
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

  // Auth — Forgot Password
  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/api/auth/forgot-password", { email });
      set({ isLoading: false });
      return data; // { message }
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to send OTP";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // Auth — Reset Password (email + otp + newPassword)
  // Auth — Reset Password (email + otp + newPassword)
resetPassword: async ({ email, otp, newPassword }) => {
  set({ isLoading: true, error: null });
  try {
    // Backend expects: { email, otp, newPassword }
    const { data } = await api.post("/api/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    set({ isLoading: false });
    return data; // e.g. { message: "Password reset successful" }
  } catch (err) {
    const msg = err?.response?.data?.error || "Failed to reset password";
    set({ error: msg, isLoading: false });
    throw new Error(msg);
  }
},


  // Refresh current user (/api/user/me)
  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get("/api/user/me");
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data));
      }
      set({ user: data, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load profile";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  // Logout (interceptor will also handle 401 redirects)
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
}));
