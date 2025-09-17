"use client";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useToastStore } from "@/store/toastStore";

export default function AppToaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-[92vw] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "rounded-lg border p-3 shadow-lg backdrop-blur bg-grayt-900/80 border-gray-800 text-white",
            t.variant === "destructive" ? "border-red-600/60 bg-red-950/70" : "",
          ].join(" ")}
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {t.title ? <div className="font-semibold">{t.title}</div> : null}
              {t.description ? (
                <p className="text-sm text-gray-300">{t.description}</p>
              ) : null}
              {t.action ? (
                <button
                  onClick={() => {
                    try { t.action.onClick?.(); } finally { dismiss(t.id); }
                  }}
                  className="mt-2 text-sm font-medium underline"
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 rounded hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
