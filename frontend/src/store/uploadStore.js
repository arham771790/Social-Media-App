// src/store/uploadStore.js
"use client";
import { create } from "zustand";
import api from "@/lib/axios";

export const useUploadStore = create((set) => ({
  isUploading: false,
  error: null,

  uploadFile: async (file) => {
    set({ isUploading: true, error: null });
    try {
      const form = new FormData();
      form.append("file", file);

      // MUST match the mount: /api/upload/file
      const { data } = await api.post("/api/upload/file", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      set({ isUploading: false });
      // return the whole payload you need to create the post
      return data?.data; // { publicId, resourceType, originalUrl, optimizedUrl, thumbnailUrl, fileType, ... }
    } catch (err) {
      const msg = err?.response?.data?.error || "Upload failed";
      set({ error: msg, isUploading: false });
      throw new Error(msg);
    }
  },
}));
