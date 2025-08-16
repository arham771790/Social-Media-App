// src/components/feed/MediaRenderer.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MediaRenderer({ media, className }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!media || media.length === 0) {
    return (
      <div className={cn('bg-gray-800 flex items-center justify-center', className)}>
        <p className="text-gray-400 text-sm">No media</p>
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
      <div className={cn('bg-gray-800 flex items-center justify-center', className)}>
        <p className="text-gray-400 text-sm">Failed to load media</p>
      </div>
    );
  }

  return (
    <div className={cn('relative group', className)}>
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
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}

      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlayableVideo({ src, poster, onError }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sourceType = useMemo(() => {
    const m = String(src || '').match(/\.(mp4|webm|ogg|mov|mkv)(\?|$)/i);
    if (!m) return undefined;
    const ext = m[1].toLowerCase();
    if (ext === 'mov' || ext === 'mkv') return undefined; // let browser sniff
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'ogg') return 'video/ogg';
    return undefined;
  }, [src]);

  const toggle = (e) => {
    e?.stopPropagation?.();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
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
          className="absolute inset-0 flex items-center justify-center bg-black/20"
        >
          <div className="bg-black/50 rounded-full p-3">
            <Play className="w-8 h-8 text-white fill-current ml-1" />
          </div>
        </button>
      )}

      {isPlaying && (
        <button
          aria-label="Pause video"
          onClick={toggle}
          className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/60 text-white rounded-full p-2"
        >
          <Pause className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
