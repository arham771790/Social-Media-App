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
  // ✅ select only what you need
  const home        = useFeedStore((s) => s.home);
  const isLoading   = useFeedStore((s) => s.isLoading);
  const error       = useFeedStore((s) => s.error);
  const pagination  = useFeedStore((s) => s.pagination.home);
  const fetchHome   = useFeedStore((s) => s.fetchHome);
  const reset       = useFeedStore((s) => s.reset);

  const sentinelRef = useRef(null);
  const inFlightRef = useRef(false);
  const loadMoreTickRef = useRef(0);
  const [showStickRefresh, setShowStickRefresh] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

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

  // Actions
  const handleRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      reset();
      await fetchHome({ page: 1, limit: pagination?.limit ?? 10 });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error("Refresh failed", e);
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchHome, pagination?.limit, reset]);

  const handleLoadMore = useCallback(async () => {
    if (!pagination?.hasMore || isLoading || inFlightRef.current) return;
    const now = Date.now();
    if (now - loadMoreTickRef.current < 500) return;
    loadMoreTickRef.current = now;

    inFlightRef.current = true;
    try {
      await fetchHome({ page: (pagination?.page ?? 1) + 1, limit: pagination?.limit ?? 10 });
    } catch (e) {
      console.error("Load more failed", e);
    } finally {
      inFlightRef.current = false;
    }
  }, [fetchHome, isLoading, pagination?.hasMore, pagination?.limit, pagination?.page]);

  // Stable ref for observer
  const loadMoreRef = useRef(handleLoadMore);
  useEffect(() => {
    loadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  // Effects
  useEffect(() => {
    if ((home?.length ?? 0) === 0) {
      fetchHome({ page: 1, limit: pagination?.limit ?? 10 }).catch(() => {});
    }
    const onScroll = () => {
      setShowStickRefresh((window.scrollY || document.documentElement.scrollTop) > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !pagination?.hasMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "1000px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pagination?.hasMore]);

  // Render helpers
  if (error && posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-muted-foreground mb-4">{String(error)}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl md:max-w-3xl lg:max-w-3xl mx-auto px-2 sm:px-4 pb-24" aria-busy={isLoading}>
      {isLoading && <TopProgressBar />}

      {/* Mobile Sticky Refresh */}
      <div className={`md:hidden sticky top-0 z-20 transition-all ${showStickRefresh ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="flex justify-center py-2 bg-background/70 backdrop-blur border-b border-border/50">
          <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Desktop Refresh */}
      <div className="hidden md:flex justify-center mb-6">
        <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh Feed
        </Button>
      </div>

      <AnimatePresence mode={prefersReducedMotion ? "wait" : "popLayout"}>
        {posts.map((post) => (
          <motion.div key={post.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
        </div>
      )}

      {pagination?.hasMore && !isLoading && posts.length > 0 && (
        <div className="text-center py-8">
          <Button onClick={handleLoadMore} variant="outline">Load More Posts</Button>
        </div>
      )}

      {!pagination?.hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">You're all caught up! 🎉</div>
      )}

      {!isLoading && posts.length === 0 && !error && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Start following people or create your first post!</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
