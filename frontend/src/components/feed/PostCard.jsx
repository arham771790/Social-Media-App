'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { useFeedStore } from '@/store/feedStore';
import { usePostStore } from '@/store/postStore';
import { useSocialStore } from '@/store/socialStore';
import Comments from './Comments';
import MediaRenderer from './MediaRenderer';
import PostActions from './PostActions';
import PostContent from './PostContent';
import PostHeader from './PostHeader';

export default function PostCard({ post }) {
  const { toggleLike, toggleBookmark } = usePostStore();
  const { patchFeedItem } = useFeedStore();
  const { user: currentUser } = useAuthStore();
  const { followUser, unfollowUser, getFollowing, followingByUser, followPending } = useSocialStore();

  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  useEffect(() => setLocalPost(post), [post]);

  const isOwnPost = currentUser?.id === localPost.author.id;
  const myKey = String(currentUser?.id || '');
  const myFollowing = followingByUser[myKey]?.items || [];
  const cachedFollowing = useMemo(() => new Set(myFollowing.map((u) => u.id)), [myFollowing]);
  const isFollowing = cachedFollowing.has(localPost.author.id) || !!localPost.author.isFollowing;

  const looksLikeVideo = useCallback(
    (url) => typeof url === 'string' && /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(url),
    []
  );

  const isVideo = localPost?.type === 'VIDEO' || looksLikeVideo(localPost?.mediaUrl);

  const handleLike = useCallback(async () => {
    if (likePending) return;
    setLikePending(true);
    try {
      const nextLiked = !localPost.isLiked;
      const nextLikes = (localPost.likesCount || 0) + (nextLiked ? 1 : -1);
      setLocalPost((old) => ({
        ...old,
        isLiked: nextLiked,
        likesCount: Math.max(0, nextLikes),
      }));

      const res = await toggleLike(localPost.id);
      setLocalPost((old) => ({ ...old, isLiked: res.isLiked, likesCount: res.likesCount }));
      patchFeedItem(localPost.id, { isLiked: res.isLiked, likesCount: res.likesCount });
    } catch {
      setLocalPost(post);
    } finally {
      setLikePending(false);
    }
  }, [likePending, localPost.id, localPost.isLiked, localPost.likesCount, patchFeedItem, post, toggleLike]);

  const handleBookmark = useCallback(async () => {
    if (bookmarkPending) return;
    setBookmarkPending(true);
    try {
      const nextBookmarked = !localPost.isBookmarked;
      setLocalPost((old) => ({ ...old, isBookmarked: nextBookmarked }));

      const res = await toggleBookmark(localPost.id);
      setLocalPost((old) => ({
        ...old,
        isBookmarked: !!res.isBookmarked,
        ...(typeof res.bookmarksCount === 'number' ? { bookmarksCount: res.bookmarksCount } : {}),
      }));
      patchFeedItem(localPost.id, {
        isBookmarked: !!res.isBookmarked,
        ...(typeof res.bookmarksCount === 'number' ? { bookmarksCount: res.bookmarksCount } : {}),
      });
    } catch {
      setLocalPost(post);
    } finally {
      setBookmarkPending(false);
    }
  }, [bookmarkPending, localPost.id, localPost.isBookmarked, patchFeedItem, post, toggleBookmark]);

  const onFollow = useCallback(async () => {
    try {
      await followUser(localPost.author.id);
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  }, [currentUser?.id, followUser, getFollowing, localPost.author.id]);

  const onUnfollow = useCallback(async () => {
    setConfirmUnfollow(false);
    await unfollowUser(localPost.author.id);
    getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
  }, [currentUser?.id, getFollowing, localPost.author.id, unfollowUser]);

  const updateCommentsCount = useCallback((delta = 0) => {
    setLocalPost((old) => ({
      ...old,
      commentsCount: Math.max(0, (old.commentsCount || 0) + delta),
    }));
  }, []);

  const mediaItems = localPost.mediaUrl
    ? [{
        url: localPost.mediaUrl,
        type: isVideo ? 'video' : 'image',
        thumbnail: localPost.thumbnailUrl || undefined,
      }]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden rounded-[2rem] border-white/8">
        <PostHeader
          author={localPost.author}
          createdAt={localPost.createdAt}
          isOwnPost={isOwnPost}
          isFollowing={isFollowing}
          followPending={followPending}
          onFollow={onFollow}
          onUnfollow={() => setConfirmUnfollow(true)}
        />

        <div className="px-4 pb-3 sm:px-6">
          <PostContent title={localPost.title} content={localPost.content} />

          {!!mediaItems.length && (
            <div className="mt-5">
              <MediaRenderer
                className="w-full overflow-hidden rounded-[1.75rem] border border-white/6 bg-muted/20"
                media={mediaItems}
              />
            </div>
          )}

          {!!localPost.tags?.length && (
            <div className="mt-5 flex flex-wrap gap-2">
              {localPost.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
              {localPost.tags.length > 4 && (
                <Badge variant="outline">+{localPost.tags.length - 4} more</Badge>
              )}
            </div>
          )}
        </div>

        <PostActions
          isLiked={localPost.isLiked}
          likesCount={localPost.likesCount}
          isBookmarked={localPost.isBookmarked}
          commentsCount={localPost.commentsCount}
          likePending={likePending}
          bookmarkPending={bookmarkPending}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onToggleComments={() => setShowComments((s) => !s)}
        />

        {showComments && (
          <Comments
            postId={localPost.id}
            onAdded={() => updateCommentsCount(1)}
            onDeleted={() => updateCommentsCount(-1)}
          />
        )}
      </Card>

      <Dialog open={confirmUnfollow} onOpenChange={setConfirmUnfollow}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Unfollow @{localPost.author.username}?</DialogTitle>
            <DialogDescription>
              Their posts will fade from your feed until you follow them again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmUnfollow(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onUnfollow}>Unfollow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
