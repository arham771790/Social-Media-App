"use client";
import { create } from "zustand";

let idSeq = 0;

export const useToastStore = create((set, get) => ({
  toasts: [],
  show: (t = {}) => {
    const id = ++idSeq;
    const {
      title = "",
      description = "",
      variant = "default", // "default" | "destructive"
      duration = 3000,
      action, // { label, onClick }
    } = t;

    const toast = { id, title, description, variant, action };
    set({ toasts: [...get().toasts, toast] });

    if (duration > 0) {
      setTimeout(() => {
        get().dismiss(id);
      }, duration);
    }
    return id;
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter((x) => x.id !== id) }),
  clear: () => set({ toasts: [] }),
}));
