// src/components/feed/FeedContainer.jsx
"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "./PostCard";
import PostSkeleton from "./PostSkeleton";
import { useFeedStore } from "@/store/feedStore";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

/* ——— tiny UI helper ——— */
function TopProgressBar() {
  return (
    <div className="sticky top-0 z-30 h-0.5 -mt-0.5">
      <div className="relative h-full bg-transparent">
        <div
          className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-foreground/70"
          style={{ animation: "ig-bar 1.1s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

/* keyframes once globally */
if (typeof window !== "undefined" && !document.getElementById("feed-igbar-style")) {
  const style = document.createElement("style");
  style.id = "feed-igbar-style";
  style.innerHTML = `
    @keyframes ig-bar {
      0% { transform: translateX(-60%); }
      50% { transform: translateX(10%); }
      100% { transform: translateX(110%); }
    }
  `;
  document.head.appendChild(style);
}

export default function FeedContainer() {
  // ✅ select only what you need (no object selector → fewer re-renders)
  const home        = useFeedStore((s) => s.home);
  const isLoading   = useFeedStore((s) => s.isLoading);
  const error       = useFeedStore((s) => s.error);
  const pagination  = useFeedStore((s) => s.pagination);
  const fetchHome   = useFeedStore((s) => s.fetchHome);
  const reset       = useFeedStore((s) => s.reset);

  const sentinelRef = useRef(null);
  const inFlightRef = useRef(false);           // prevent overlapping fetches
  const loadMoreTickRef = useRef(0);           // simple throttle
  const mountedRef = useRef(false);
  const [showStickRefresh, setShowStickRefresh] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // Dedup posts by id (defensive; your store may already handle this)
  const posts = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of home || []) {
      if (!p?.id) continue;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [home]);

  // Initial load (only if list is empty)
  useEffect(() => {
    mountedRef.current = true;
    if ((home?.length ?? 0) === 0) {
      fetchHome({ page: 1, limit: pagination?.limit ?? 10 }).catch(() => {});
    }
    // sticky refresh visibility on scroll (mobile nicety)
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowStickRefresh(y > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const handleRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      reset();
      await fetchHome({ page: 1, limit: pagination?.limit ?? 10 });
      // scroll to top after refresh (nice on mobile)
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // ignore (error UI below covers it)
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchHome, pagination?.limit, reset]);

  const handleLoadMore = useCallback(async () => {
    if (!pagination?.hasMore || isLoading || inFlightRef.current) return;

    // simple throttle: skip triggers fired within 500ms of previous
    const now = Date.now();
    if (now - loadMoreTickRef.current < 500) return;
    loadMoreTickRef.current = now;

    inFlightRef.current = true;
    try {
      await fetchHome({ page: (pagination?.page ?? 1) + 1, limit: pagination?.limit ?? 10 });
    } catch {
      // ignore; user can tap "Load more"
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchHome, isLoading, pagination?.hasMore, pagination?.limit, pagination?.page]);

  // Intersection Observer (auto-load on scroll near bottom)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!pagination?.hasMore) return;

    // generous rootMargin so we prefetch before bottom is on-screen
    const rootMargin = "1000px 0px 1000px 0px";
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) handleLoadMore();
      },
      { root: null, rootMargin, threshold: 0 }
    );

    obs.observe(el);
    return () => {
      obs.unobserve(el);
      obs.disconnect();
    };
  }, [handleLoadMore, pagination?.hasMore]);

  // Error view when nothing loaded
  if (error && posts.length === 0) {
    return (
      <div className="max-w-2xl md:max-w-3xl lg:max-w-3xl mx-auto px-2 sm:px-4 pb-24 [padding-bottom:env(safe-area-inset-bottom)]">
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            {String(error) || "Failed to load feed"}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl md:max-w-3xl lg:max-w-3xl mx-auto px-2 sm:px-4 pb-24 [padding-bottom:env(safe-area-inset-bottom)]"
      aria-busy={isLoading ? "true" : "false"}
    >
      {/* Top loader bar (subtle) */}
      {isLoading && <TopProgressBar />}

      {/* Sticky mobile refresh (appears after slight scroll) */}
      <div
        className={[
          "md:hidden sticky top-0 z-20 transition-all duration-300",
          showStickRefresh ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
        ].join(" ")}
      >
        <div className="flex justify-center py-2 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-b border-border/50">
          <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top refresh (desktop/always visible) */}
      <div className="hidden md:flex justify-center mb-6">
        <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      {/* Posts */}
      <AnimatePresence mode={prefersReducedMotion ? "wait" : "popLayout"}>
        {posts.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mb-6"
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={`sk-${i}`} />
          ))}
        </div>
      )}

      {/* Load More (fallback if IO not triggered) */}
      {pagination?.hasMore && !isLoading && posts.length > 0 && (
        <div className="text-center py-8">
          <Button onClick={handleLoadMore} variant="outline">
            Load More Posts
          </Button>
        </div>
      )}

      {/* End of Feed */}
      {!pagination?.hasMore && posts.length > 0 && (
        <div className="text-center py-8" aria-live="polite">
          <p className="text-muted-foreground">You're all caught up! 🎉</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && !error && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">
            Start following people or create your first post!
          </p>
        </div>
      )}

      {/* Sentinel for auto-load */}
      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
