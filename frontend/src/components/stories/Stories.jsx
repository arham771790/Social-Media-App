// src/components/stories/Stories.jsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocialStore } from '@/store/socialStore';
import StoryRing from './StoryRing';
import StoryViewer from './StoryViewer';
import CreateStoryModal from './CreateStoryModal';

export default function Stories() {
  const me = useAuthStore(s => s.user);
  const { storiesByUser, fetchPublicStories, createStory, deleteStory, error } = useSocialStore();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewedIds, setViewedIds] = useState(() => new Set());

  const publicCache = storiesByUser?.public || { items: [], isLoading: false };
  const allStories = publicCache.items || [];
  const isLoading = publicCache.isLoading;

  // Group by user robustly
  const groups = useMemo(() => {
    const map = new Map(); // userId -> { user, stories: [], latestStory }
    for (const s of allStories) {
      const uid = s.user?.id || s.userId || 'unknown';
      const user = s.user || { id: uid, username: 'user', avatar: '/default-avatar.png' };
      if (!map.has(uid)) {
        map.set(uid, { user, stories: [], latestStory: s });
      }
      const g = map.get(uid);
      g.stories.push(s);
      if (!g.latestStory || new Date(s.createdAt) > new Date(g.latestStory.createdAt)) {
        g.latestStory = s;
      }
    }
    return Array.from(map.values());
  }, [allStories]);

  useEffect(() => {
    fetchPublicStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openViewer = useCallback((group, startIndex = 0) => {
    setCurrentGroup(group.stories);
    setCurrentIndex(startIndex);
    setViewerOpen(true);
    setViewedIds(prev => new Set([...prev, ...group.stories.map(st => st.id)]));
  }, []);

  const closeViewer = useCallback(() => {
    setViewerOpen(false);
    setCurrentGroup([]);
    setCurrentIndex(0);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex(i => (i < currentGroup.length - 1 ? i + 1 : i));
  }, [currentGroup.length]);

  const prev = useCallback(() => {
    setCurrentIndex(i => (i > 0 ? i - 1 : 0));
  }, []);

  const handleCreate = useCallback(async (payload) => {
    await createStory(payload);
    setCreateOpen(false);
  }, [createStory]);

  const handleDelete = useCallback(async (storyId) => {
    await deleteStory(storyId);
    // if we deleted current, adjust
    setCurrentGroup((arr) => {
      const next = arr.filter(s => s.id !== storyId);
      if (next.length === 0) {
        closeViewer();
      } else if (currentIndex >= next.length) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  }, [deleteStory, closeViewer, currentIndex]);

  if (isLoading) {
    return (
      <div className="w-full border-b border-gray-800">
        <div className="flex gap-4 p-3 overflow-x-auto scrollbar-thin">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-gray-800 animate-pulse" />
              <div className="w-12 h-3 rounded bg-gray-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full border-b border-gray-800 bg-black/40 backdrop-blur">
        <div className="flex gap-4 p-3 overflow-x-auto scrollbar-thin">
          {/* Your story (add) */}
          <StoryRing
            user={me}
            showAddButton
            hasStory={false}
            isViewed={false}
            onClick={() => setCreateOpen(true)}
          />

          {/* Others */}
          {groups.map((g, idx) => {
            const hasStory = g.stories.length > 0;
            const seen = hasStory && g.stories.every(st => viewedIds.has(st.id));
            const key = g.user?.id || g.latestStory?.userId || idx; // robust key
            return (
              <StoryRing
                key={key}
                user={g.user}
                hasStory={hasStory}
                isViewed={seen}
                onClick={() => openViewer(g, 0)}
              />
            );
          })}
        </div>

        {error && (
          <div className="px-4 pb-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Viewer */}
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

      {/* Create Modal */}
      <CreateStoryModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
