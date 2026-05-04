'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Trash2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export default function StoryViewer({
  stories,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  canDelete = false,
  onDelete,
}) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressInterval = useRef(null);
  const videoRef = useRef(null);

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

    if (!isPaused) {
      progressInterval.current = setInterval(tick, 50);
    } else {
      clearInterval(progressInterval.current);
    }
    return () => clearInterval(progressInterval.current);
  }, [currentIndex, currentStory, defer, isPaused, onClose, onNext, stories.length]);

  useEffect(() => {
    setProgress(0);
    setIsPaused(false);
  }, [currentIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory?.type !== 'VIDEO') return;
    if (isPaused) video.pause();
    else video.play().catch(() => {});
  }, [currentStory?.type, currentIndex, isPaused]);

  const handlePauseToggle = useCallback(() => {
    if (currentStory?.type === 'VIDEO') {
      setIsPaused((paused) => !paused);
    }
  }, [currentStory?.type]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowRight' && currentIndex < stories.length - 1) onNext();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onPrevious();
    if (e.key === 'Escape') onClose();
    if (e.key === ' ') {
      e.preventDefault();
      handlePauseToggle();
    }
  }, [currentIndex, handlePauseToggle, onClose, onNext, onPrevious, stories.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[rgba(7,10,13,0.92)] backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />

      <div className="flex h-full items-center justify-center px-3 py-4 sm:px-6">
        <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(10,12,17,0.72)] shadow-[0_40px_100px_-50px_rgba(0,0,0,1)] backdrop-blur-xl sm:max-w-[460px]">
          <div className="absolute inset-x-0 top-0 z-20 px-3 pb-4 pt-3">
            <div className="mb-3 flex gap-1.5">
              {stories.map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/14">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{
                      width:
                        i < currentIndex ? '100%' :
                        i === currentIndex ? `${progress}%` : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3 text-white">
                <Avatar className="size-10 border-white/10">
                  <AvatarImage src={currentStory.user?.avatar || '/default-avatar.png'} alt={currentStory.user?.username || 'user'} />
                  <AvatarFallback>{currentStory.user?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-[-0.01em]">
                    {currentStory.user?.username || 'user'}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                    {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentStory.type === 'VIDEO' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full bg-[rgba(10,12,17,0.45)] text-white"
                    onClick={handlePauseToggle}
                    title={isPaused ? 'Resume' : 'Pause'}
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-full bg-[rgba(10,12,17,0.45)] text-white"
                    onClick={() => onDelete?.(currentStory.id)}
                    title="Delete story"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 rounded-full bg-[rgba(10,12,17,0.45)] text-white"
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex-1" onClick={handlePauseToggle}>
            {currentStory.type === 'VIDEO' ? (
              <video
                ref={videoRef}
                src={currentStory.mediaUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={currentStory.mediaUrl}
                alt="Story"
                className="h-full w-full object-cover"
                loading="eager"
              />
            )}

            {currentStory.type === 'VIDEO' && isPaused && (
              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <div className="rounded-full border border-white/12 bg-[rgba(10,12,17,0.58)] p-4 text-white backdrop-blur-md">
                  <Play className="ml-0.5 h-10 w-10 fill-current" />
                </div>
              </div>
            )}

            {currentStory.caption && (
              <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-[rgba(10,12,17,0.52)] p-3 text-sm leading-6 text-white/90 backdrop-blur-md">
                  {currentStory.caption}
                </div>
              </div>
            )}
          </div>

          {currentIndex > 0 && (
            <button
              onClick={onPrevious}
              className="absolute left-0 top-0 z-10 h-full w-1/3"
              aria-label="Previous"
            />
          )}
          <button
            onClick={() => {
              if (currentIndex < stories.length - 1) onNext();
              else onClose();
            }}
            className="absolute right-0 top-0 z-10 h-full w-1/3"
            aria-label="Next"
          />

          {currentIndex > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 rounded-full bg-[rgba(10,12,17,0.48)] text-white sm:inline-flex"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {currentIndex < stories.length - 1 && (
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              className="absolute right-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 rounded-full bg-[rgba(10,12,17,0.48)] text-white sm:inline-flex"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
