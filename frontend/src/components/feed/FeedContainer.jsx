'use client';
import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';
import { useFeedStore } from '@/store/feedStore';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function FeedContainer() {
  const { home, isLoading, error, pagination, fetchHome, reset } = useFeedStore();
  const sentinelRef = useRef(null);

  // Initial load (only if list is empty)
  useEffect(() => {
    if (home.length === 0) {
      fetchHome({ page: 1, limit: pagination.limit }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const handleRefresh = useCallback(async () => {
    reset();
    try {
      await fetchHome({ page: 1, limit: pagination.limit });
    } catch {}
  }, [fetchHome, pagination.limit, reset]);

  const handleLoadMore = useCallback(async () => {
    if (!pagination.hasMore || isLoading) return;
    try {
      await fetchHome({ page: pagination.page + 1, limit: pagination.limit });
    } catch {}
  }, [fetchHome, isLoading, pagination.hasMore, pagination.limit, pagination.page]);

  // Optional: auto-load on scroll (intersection observer)
  useEffect(() => {
    if (!sentinelRef.current) return;
    if (!pagination.hasMore) return;

    const el = sentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) handleLoadMore();
      },
      { rootMargin: '200px' }
    );

    obs.observe(el);
    return () => obs.unobserve(el);
  }, [handleLoadMore, pagination.hasMore]);

  if (error && home.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">{String(error) || 'Failed to load feed'}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Refresh Button */}
      <div className="flex justify-center mb-6">
        <Button onClick={handleRefresh} variant="ghost" size="sm" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </Button>
      </div>

      {/* Posts */}
      <AnimatePresence mode="popLayout">
        {home.map((post) => (
          <motion.div key={post.id} layout>
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Load More (fallback if intersection not used or not triggered) */}
      {pagination.hasMore && !isLoading && home.length > 0 && (
        <div className="text-center py-8">
          <Button onClick={handleLoadMore} variant="outline">
            Load More Posts
          </Button>
        </div>
      )}

      {/* End of Feed */}
      {!pagination.hasMore && home.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">You're all caught up! 🎉</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && home.length === 0 && (
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
