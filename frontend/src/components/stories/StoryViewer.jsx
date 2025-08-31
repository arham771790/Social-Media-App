// src/components/stories/StoryViewer.jsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2, Play } from 'lucide-react';

export default function StoryViewer({
  stories,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  canDelete = false,
  onDelete,       // (storyId) => void
}) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const progressInterval = useRef(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000;

  const defer = useCallback((fn) => setTimeout(fn, 0), []);

  useEffect(() => {
    if (!currentStory) return;
    const tick = () => {
      setProgress((prev) => {
        const next = prev + (100 / (STORY_DURATION / 50));
        if (next >= 100) {
          if (currentIndex < stories.length - 1) defer(onNext);
          else defer(onClose);
          return 0;
        }
        return next;
      });
    };

    if (!isPaused && isPlaying) {
      progressInterval.current = setInterval(tick, 50);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [currentIndex, isPaused, isPlaying, currentStory, onNext, onClose, stories.length, defer]);

  useEffect(() => setProgress(0), [currentIndex]);

  const handlePauseToggle = () => {
    if (currentStory?.type === 'VIDEO') {
      setIsPaused((p) => !p);
      setIsPlaying((p) => !p);
    }
  };

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowRight' && currentIndex < stories.length - 1) onNext();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onPrevious();
    if (e.key === 'Escape') onClose();
    if (e.key === ' ') {
      e.preventDefault();
      handlePauseToggle();
    }
  }, [currentIndex, stories.length, onNext, onPrevious, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center">
      {/* Header: user + actions */}
      <div className="absolute top-0 left-0 right-0 px-3 sm:px-4 pt-4">
        {/* Progress bars */}
        <div className="flex gap-1 mb-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width:
                    i < currentIndex ? '100%' :
                    i === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* User row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <img
              src={currentStory.user?.avatar || '/default-avatar.png'}
              alt={currentStory.user?.username || 'user'}
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm">
              <div className="font-semibold leading-tight">
                {currentStory.user?.username || 'user'}
              </div>
              <div className="text-[11px] text-white/70">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                onClick={() => onDelete?.(currentStory.id)}
                title="Delete story"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={onClose}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={onPrevious}
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
          aria-label="Previous"
        >
          <ChevronLeft className="w-9 h-9" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={onNext}
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
          aria-label="Next"
        >
          <ChevronRight className="w-9 h-9" />
        </button>
      )}

      {/* Content */}
      <div
        className="relative w-full h-full max-w-[480px] sm:max-w-[640px] md:max-w-[800px] aspect-[9/16] mx-auto"
        onClick={handlePauseToggle}
      >
        {currentStory.type === 'VIDEO' ? (
          <video
            src={currentStory.mediaUrl}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="w-full h-full object-cover"
            loading="eager"
          />
        )}

        {/* Video paused overlay */}
        {currentStory.type === 'VIDEO' && isPaused && (
          <div className="absolute inset-0 grid place-items-center bg-black/30">
            <Play className="w-16 h-16 text-white/90" />
          </div>
        )}

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-4 right-4 text-white">
            <p className="text-sm bg-black/40 p-2 rounded">
              {currentStory.caption}
            </p>
          </div>
        )}
      </div>

      {/* Full-screen tap areas (mobile) */}
      <div className="absolute inset-0 sm:hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1/2" onClick={(e) => { e.stopPropagation(); if (currentIndex > 0) onPrevious(); }} />
        <div className="absolute right-0 top-0 bottom-0 w-1/2" onClick={(e) => { e.stopPropagation(); if (currentIndex < stories.length - 1) onNext(); else onClose(); }} />
      </div>
    </div>
  );
}
