"use client";
import { create } from "zustand";
import api from "@/lib/axios";

export const useAIStore = create((set) => ({
  isGenerating: false,
  error: null,

  generateTags: async (content) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await api.post("/ai/generate-tags", { content });
      set({ isGenerating: false });
      return data?.tags || [];
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to generate tags";
      set({ error: msg, isGenerating: false });
      throw new Error(msg);
    }
  },

  suggestCaptions: async (content) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await api.post("/ai/suggest-captions", { content });
      set({ isGenerating: false });
      return data?.captions || [];
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to suggest captions";
      set({ error: msg, isGenerating: false });
      throw new Error(msg);
    }
  },

  suggestMediaAwareCaptions: async (mediaUrl) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await api.post("/ai/captions/media", { mediaUrl });
      set({ isGenerating: false });
      return data?.captions || [];
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to suggest media captions";
      set({ error: msg, isGenerating: false });
      throw new Error(msg);
    }
  },

  titleFromContent: async (content) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await api.post("/ai/title-from-content", { content });
      set({ isGenerating: false });
      return data?.title || "";
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to generate title";
      set({ error: msg, isGenerating: false });
      throw new Error(msg);
    }
  },
}));
