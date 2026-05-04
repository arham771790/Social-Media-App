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
            "rounded-[calc(var(--radius)+2px)] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] bg-card/95 p-4 text-foreground shadow-[0_24px_60px_-32px_rgba(0,0,0,0.95)] backdrop-blur-xl",
            t.variant === "destructive" ? "border-destructive/25 bg-destructive/12 text-destructive-foreground" : "",
          ].join(" ")}
          role="status"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {t.title ? <div className="font-semibold tracking-[-0.01em]">{t.title}</div> : null}
              {t.description ? (
                <p className="text-sm leading-6 text-muted-foreground">{t.description}</p>
              ) : null}
              {t.action ? (
                <button
                  onClick={() => {
                    try { t.action.onClick?.(); } finally { dismiss(t.id); }
                  }}
                  className="mt-3 inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.04]"
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-full border border-transparent p-1.5 text-muted-foreground transition-all hover:border-white/10 hover:bg-white/[0.04] hover:text-foreground"
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
