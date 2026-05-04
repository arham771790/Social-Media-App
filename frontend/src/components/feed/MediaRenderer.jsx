'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MediaRenderer({ media, className }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!media || media.length === 0) {
    return (
      <div className={cn('flex items-center justify-center bg-background/30', className)}>
        <p className="text-sm text-muted-foreground">No media</p>
      </div>
    );
  }

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;

  const goToPrevious = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
    setImageError(false);
  };

  const goToNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
    setImageError(false);
  };

  const looksLikeVideo = (url) =>
    typeof url === 'string' && /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(url);

  const isVideo =
    (currentMedia?.type && String(currentMedia.type).toLowerCase() === 'video') ||
    looksLikeVideo(currentMedia?.url);

  if (imageError) {
    return (
      <div className={cn('flex items-center justify-center bg-background/30', className)}>
        <p className="text-sm text-muted-foreground">Failed to load media</p>
      </div>
    );
  }

  return (
    <div className={cn('group relative overflow-hidden', className)}>
      {isVideo ? (
        <PlayableVideo
          src={currentMedia.url}
          poster={currentMedia.thumbnail}
          onError={() => setImageError(true)}
        />
      ) : (
        <img
          src={currentMedia.url || currentMedia}
          alt="Post media"
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {hasMultiple && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-[rgba(10,12,17,0.55)] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 sm:inline-flex"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-[rgba(10,12,17,0.55)] text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 sm:inline-flex"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  'h-2 rounded-full transition-all duration-200',
                  index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/45'
                )}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute left-4 top-4 rounded-full border border-white/12 bg-[rgba(10,12,17,0.55)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
        {isVideo ? 'Video' : 'Image'}
      </div>
    </div>
  );
}

function PlayableVideo({ src, poster, onError }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sourceType = useMemo(() => {
    const match = String(src || '').match(/\.(mp4|webm|ogg|mov|mkv)(\?|$)/i);
    if (!match) return undefined;
    const ext = match[1].toLowerCase();
    if (ext === 'mov' || ext === 'mkv') return undefined;
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'ogg') return 'video/ogg';
    return undefined;
  }, [src]);

  const toggle = (e) => {
    e?.stopPropagation?.();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onClick={toggle}
        onError={onError}
      >
        {sourceType ? <source src={src} type={sourceType} /> : <source src={src} />}
        Your browser does not support the video tag.
      </video>

      {!isPlaying && (
        <button
          aria-label="Play video"
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center bg-black/10"
        >
          <div className="rounded-full border border-white/15 bg-[rgba(10,12,17,0.58)] p-4 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md">
            <Play className="ml-0.5 h-8 w-8 fill-current" />
          </div>
        </button>
      )}

      {isPlaying && (
        <button
          aria-label="Pause video"
          onClick={toggle}
          className="absolute bottom-4 right-4 rounded-full border border-white/12 bg-[rgba(10,12,17,0.55)] p-2.5 text-white backdrop-blur-md"
        >
          <Pause className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
