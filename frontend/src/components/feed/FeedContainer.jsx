"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import PostCard from "./PostCard";
import PostSkeleton from "./PostSkeleton";
import { useFeedStore } from "@/store/feedStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function TopProgressBar() {
  return (
    <div className="sticky top-0 z-30 h-px">
      <div className="relative h-full overflow-hidden rounded-full bg-white/[0.04]">
        <div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary/80"
          style={{ animation: "ig-bar 1.1s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

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
  const home = useFeedStore((s) => s.home);
  const isLoading = useFeedStore((s) => s.isLoading);
  const error = useFeedStore((s) => s.error);
  const pagination = useFeedStore((s) => s.pagination.home);
  const fetchHome = useFeedStore((s) => s.fetchHome);
  const reset = useFeedStore((s) => s.reset);

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
    for (const post of home || []) {
      if (!post?.id || seen.has(post.id)) continue;
      seen.add(post.id);
      out.push(post);
    }
    return out;
  }, [home]);

  const handleRefresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      reset();
      await fetchHome({ page: 1, limit: pagination?.limit ?? 10 });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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

  const loadMoreRef = useRef(handleLoadMore);
  useEffect(() => {
    loadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  useEffect(() => {
    if ((home?.length ?? 0) === 0) {
      fetchHome({ page: 1, limit: pagination?.limit ?? 10 }).catch(() => {});
    }
    const onScroll = () => {
      setShowStickRefresh((window.scrollY || document.documentElement.scrollTop) > 120);
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

  if (error && posts.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-2 py-10 sm:px-4">
        <Card className="rounded-[2rem] text-center">
          <CardHeader>
            <CardTitle className="text-[1.8rem]">The feed stalled</CardTitle>
            <CardDescription>{String(error)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-2 pb-24 sm:px-4" aria-busy={isLoading}>
      {isLoading && <TopProgressBar />}

      <div className="mb-6 space-y-4">
        <Card className="rounded-[2.15rem] border-white/8">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Feed
                </div>
                <CardTitle className="text-[2.1rem]">Fresh writing, clear visuals</CardTitle>
                <CardDescription>
                  A quieter stream for posts, photos, and short videos.
                </CardDescription>
              </div>
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading} className="shrink-0 rounded-full">
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div
          className={`md:hidden sticky top-2 z-20 transition-all ${showStickRefresh ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <div className="surface-panel flex justify-center rounded-full px-3 py-2">
            <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading} className="rounded-full">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh stream
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence mode={prefersReducedMotion ? "wait" : "popLayout"}>
        {posts.map((post) => (
          <motion.div
            key={post.id}
            layout
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mb-6"
          >
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
        <div className="py-8 text-center">
          <Button onClick={handleLoadMore} variant="outline" size="lg" className="rounded-full">
            Load more posts
          </Button>
        </div>
      )}

      {!pagination?.hasMore && posts.length > 0 && (
        <Card className="rounded-[1.8rem] border-white/7 text-center">
          <CardContent className="py-8">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">You are caught up</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && posts.length === 0 && !error && (
        <Card className="rounded-[2rem] text-center">
          <CardHeader>
            <CardTitle className="text-[1.8rem]">No posts yet</CardTitle>
            <CardDescription>
              Start following people or publish your first note.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div ref={sentinelRef} className="h-2" />
    </div>
  );
}
