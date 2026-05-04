'use client';

import { motion } from 'framer-motion';
import { Bookmark, Heart, Loader2, MessageCircle, Share } from 'lucide-react';
import { cn } from '@/lib/utils';

function ActionButton({ active = false, tone = 'default', label, count, pending, onClick, icon }) {
  const toneClasses = {
    default: active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-white/6 bg-background/24 text-muted-foreground hover:text-foreground',
    danger: active ? 'border-rose-500/24 bg-rose-500/12 text-rose-300' : 'border-white/6 bg-background/24 text-muted-foreground hover:text-rose-300',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200',
        toneClasses[tone]
      )}
      disabled={pending}
      aria-label={label}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      <span className="font-medium tracking-[-0.01em]">{count}</span>
    </motion.button>
  );
}

export default function PostActions({
  isLiked,
  likesCount,
  isBookmarked,
  commentsCount,
  likePending,
  bookmarkPending,
  onLike,
  onBookmark,
  onToggleComments,
}) {
  return (
    <div className="border-t border-white/6 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            active={isLiked}
            tone="danger"
            label="Like post"
            count={likesCount || 0}
            pending={likePending}
            onClick={onLike}
            icon={<Heart className={cn('h-4 w-4', isLiked && 'fill-current')} />}
          />

          <ActionButton
            label="Toggle comments"
            count={commentsCount || 0}
            onClick={onToggleComments}
            icon={<MessageCircle className="h-4 w-4" />}
          />

          <motion.button
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/6 bg-background/24 px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground"
            aria-label="Share post"
          >
            <Share className="h-4 w-4" />
            <span className="font-medium tracking-[-0.01em]">Share</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBookmark}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all duration-200',
            isBookmarked
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-white/6 bg-background/24 text-muted-foreground hover:text-foreground'
          )}
          disabled={bookmarkPending}
          aria-label="Bookmark post"
        >
          {bookmarkPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
          )}
          <span className="font-medium tracking-[-0.01em]">Save</span>
        </motion.button>
      </div>
    </div>
  );
}
