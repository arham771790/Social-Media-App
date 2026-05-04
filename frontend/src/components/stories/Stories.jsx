'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSocialStore } from '@/store/socialStore';
import { Skeleton } from '@/components/ui/skeleton';
import StoryRing from './StoryRing';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

export default function Stories() {
  const me = useAuthStore((s) => s.user);
  const { storiesByUser, fetchPublicStories, createStory, deleteStory, error } = useSocialStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewedIds, setViewedIds] = useState(() => new Set());

  const publicCache = storiesByUser?.public || { items: [], isLoading: false };
  const allStories = publicCache.items || [];
  const isLoading = publicCache.isLoading;

  const groups = useMemo(() => {
    const map = new Map();
    for (const story of allStories) {
      const uid = story.user?.id || story.userId || 'unknown';
      const user = story.user || { id: uid, username: 'user', avatar: '/default-avatar.png' };
      if (!map.has(uid)) {
        map.set(uid, { user, stories: [], latestStory: story });
      }
      const group = map.get(uid);
      group.stories.push(story);
      if (!group.latestStory || new Date(story.createdAt) > new Date(group.latestStory.createdAt)) {
        group.latestStory = story;
      }
    }
    return Array.from(map.values());
  }, [allStories]);

  useEffect(() => {
    fetchPublicStories();
  }, [fetchPublicStories]);

  const openViewer = useCallback((group, startIndex = 0) => {
    setCurrentGroup(group.stories);
    setCurrentIndex(startIndex);
    setViewerOpen(true);
    setViewedIds((prev) => new Set([...prev, ...group.stories.map((story) => story.id)]));
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentGroup([]);
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((index) => (index < currentGroup.length - 1 ? index + 1 : index));
  }, [currentGroup.length]);

  const prev = useCallback(() => {
    setCurrentIndex((index) => (index > 0 ? index - 1 : 0));
  }, []);

  const handleCreate = useCallback(async (payload) => {
    await createStory(payload);
    setCreateOpen(false);
  }, [createStory]);

  const handleDelete = useCallback(async (storyId) => {
    await deleteStory(storyId);
    setCurrentGroup((current) => {
      const nextStories = current.filter((story) => story.id !== storyId);
      if (nextStories.length === 0) {
        closeViewer();
      } else if (currentIndex >= nextStories.length) {
        setCurrentIndex(nextStories.length - 1);
      }
      return nextStories;
    });
  }, [closeViewer, currentIndex, deleteStory]);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Stories
            </div>
            <h2 className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-foreground">
              What people are sharing
            </h2>
          </div>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            24h window
          </span>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto px-1 pb-1 custom-scrollbar">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center gap-2">
                <Skeleton className="size-[4.5rem] rounded-full" />
                <Skeleton className="h-3 w-14 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-1 pb-1 custom-scrollbar">
            <StoryRing
              user={me}
              showAddButton
              hasStory={false}
              isViewed={false}
              onClick={() => setCreateOpen(true)}
            />

            {groups.map((group, idx) => {
              const hasStory = group.stories.length > 0;
              const seen = hasStory && group.stories.every((story) => viewedIds.has(story.id));
              const key = group.user?.id || group.latestStory?.userId || idx;
              return (
                <StoryRing
                  key={key}
                  user={group.user}
                  hasStory={hasStory}
                  isViewed={seen}
                  onClick={() => openViewer(group, 0)}
                />
              );
            })}
          </div>
        )}

        {error && (
          <div className="px-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {viewerOpen && (
        <StoryViewer
          stories={currentGroup}
          currentIndex={currentIndex}
          onClose={closeViewer}
          onNext={next}
          onPrevious={prev}
          canDelete={!!me && currentGroup[currentIndex]?.userId === me.id}
          onDelete={handleDelete}
        />
      )}

      <CreateStoryModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
