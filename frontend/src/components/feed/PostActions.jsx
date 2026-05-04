'use client';

import { Heart, MessageCircle, Share, Bookmark, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PostActions({
  isLiked,
  likesCount,
  isBookmarked,
  commentsCount,
  likePending,
  bookmarkPending,
  onLike,
  onBookmark,
  onToggleComments
}) {
  return (
    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onLike}
            className="flex items-center space-x-2 group"
            disabled={likePending}
          >
            {likePending ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <motion.div animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-500'}`} />
              </motion.div>
            )}
            <span className="text-sm font-medium">{likesCount}</span>
          </motion.button>

          {/* Comments */}
          <button className="flex items-center space-x-2 group" onClick={onToggleComments}>
            <MessageCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-sm font-medium">{commentsCount || 0}</span>
          </button>

          {/* Share */}
          <button className="flex items-center space-x-2 group">
            <Share className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Bookmark */}
        <motion.button whileTap={{ scale: 0.95 }} onClick={onBookmark} className="group" disabled={bookmarkPending}>
          {bookmarkPending ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <Bookmark className={`w-6 h-6 transition-colors ${isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
          )}
        </motion.button>
      </div>
    </div>
  );
}