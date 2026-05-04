// PostCard.jsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePostStore } from '@/store/postStore';
import { useAuthStore } from '@/store/authStore';
import { useSocialStore } from '@/store/socialStore';
import { useFeedStore } from '@/store/feedStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MediaRenderer from './MediaRenderer';
import Comments from './Comments';
import PostHeader from './PostHeader';
import PostContent from './PostContent';
import PostActions from './PostActions';

export default function PostCard({ post }) {
  const { toggleLike, toggleBookmark } = usePostStore();
  const { patchFeedItem } = useFeedStore();
  const { user: currentUser } = useAuthStore();
  const { followUser, unfollowUser, getFollowing, followingByUser, followPending } = useSocialStore();

  // 🔁 local mirror so UI updates instantly
  const [p, setP] = useState(post);
  useEffect(() => setP(post), [post]);

  const [showComments, setShowComments] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  const isOwnPost = currentUser?.id === p.author.id;
  const myKey = String(currentUser?.id || '');
  const myFollowing = followingByUser[myKey]?.items || [];
  const cachedFollowing = useMemo(() => new Set(myFollowing.map((u) => u.id)), [myFollowing]);
  const isFollowing = cachedFollowing.has(p.author.id) || !!p.author.isFollowing;

  // We now handle following fetch globally in AuthInitializer to avoid thundering herd loops

  const handleLike = useCallback(async () => {
    if (likePending) return;
    setLikePending(true);
    try {
      const nextLiked = !p.isLiked;
      const nextLikes = (p.likesCount || 0) + (nextLiked ? 1 : -1);
      setP((old) => ({ ...old, isLiked: nextLiked, likesCount: Math.max(0, nextLikes) }));

      const res = await toggleLike(p.id);
      setP((old) => ({ ...old, isLiked: res.isLiked, likesCount: res.likesCount }));
      patchFeedItem(p.id, { isLiked: res.isLiked, likesCount: res.likesCount });
    } catch {
      setP(post);
    } finally {
      setLikePending(false);
    }
  }, [likePending, p.isLiked, p.likesCount, p.id, toggleLike, patchFeedItem, post]);

  const handleBookmark = useCallback(async () => {
    if (bookmarkPending) return;
    setBookmarkPending(true);
    try {
      const nextBookmarked = !p.isBookmarked;
      setP((old) => ({ ...old, isBookmarked: nextBookmarked }));

      const res = await toggleBookmark(p.id);
      setP((old) => ({
        ...old,
        isBookmarked: !!res.isBookmarked,
        ...(typeof res.bookmarksCount === 'number' ? { bookmarksCount: res.bookmarksCount } : {}),
      }));
      patchFeedItem(p.id, {
        isBookmarked: !!res.isBookmarked,
        ...(typeof res.bookmarksCount === 'number' ? { bookmarksCount: res.bookmarksCount } : {}),
      });
    } catch {
      setP(post);
    } finally {
      setBookmarkPending(false);
    }
  }, [bookmarkPending, p.isBookmarked, p.id, toggleBookmark, patchFeedItem, post]);

  const onFollow = useCallback(async () => {
    try {
      await followUser(p.author.id);
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => { });
    } catch (e) {
      console.error(e);
    }
  }, [followUser, p.author.id, getFollowing, currentUser?.id]);

  const onUnfollow = useCallback(async () => {
    setConfirmUnfollow(false);
    await unfollowUser(p.author.id);
    getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => { });
  }, [unfollowUser, p.author.id, getFollowing, currentUser?.id]);

  const looksLikeVideo = useCallback((url) =>
    typeof url === 'string' && /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(url), []);

  const isVideo = p?.type === 'VIDEO' || looksLikeVideo(p?.mediaUrl);

  const bumpComments = useCallback((delta = 1) =>
    setP((old) => ({ ...old, commentsCount: Math.max(0, (old.commentsCount || 0) + delta) })), []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6">
      <Card className="bg-card border-border overflow-hidden">
        <PostHeader
          author={p.author}
          createdAt={p.createdAt}
          isOwnPost={isOwnPost}
          isFollowing={isFollowing}
          followPending={followPending}
          onFollow={onFollow}
          onUnfollow={() => setConfirmUnfollow(true)}
        />

        <PostContent title={p.title} content={p.content} />

        {/* Media Section */}
        {p.mediaUrl && (
          <MediaRenderer
            className="w-full max-h-[300px] sm:max-h-[600px] bg-muted"
            media={[
              {
                url: p.mediaUrl,
                type: isVideo ? 'video' : 'image',
                thumbnail: p.thumbnailUrl || undefined,
              },
            ]}
          />
        )}

        {/* Tags Section */}
        {!!p.tags?.length && (
          <div className="px-3 sm:px-4 pb-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {p.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {p.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{p.tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <PostActions
          isLiked={p.isLiked}
          likesCount={p.likesCount}
          isBookmarked={p.isBookmarked}
          commentsCount={p.commentsCount}
          likePending={likePending}
          bookmarkPending={bookmarkPending}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onToggleComments={() => setShowComments((s) => !s)}
        />

        {showComments && (
          <Comments
            postId={p.id}
            onAdded={() => bumpComments(1)}
            onDeleted={() => bumpComments(-1)}
          />
        )}
      </Card>

      {/* Unfollow Confirmation Dialog */}
      <Dialog open={confirmUnfollow} onOpenChange={setConfirmUnfollow}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Unfollow @{p.author.username}?</h3>
            <p className="text-sm text-muted-foreground">You’ll stop seeing their posts in your feed.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setConfirmUnfollow(false)}>Cancel</Button>
              <Button variant="destructive" onClick={onUnfollow}>Unfollow</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
