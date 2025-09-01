"use client";
import { useToastStore } from "@/store/toastStore";

export const useToast = () => {
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  return {
    toast: show,
    dismiss,
  };
};
