// PostCard.jsx
'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePostStore } from '@/store/postStore';
import { useAuthStore } from '@/store/authStore';
import { useSocialStore } from '@/store/socialStore';
import { useFeedStore } from '@/store/feedStore';
import { formatDistanceToNow } from 'date-fns';
import Comments from './Comments';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import MediaRenderer from './MediaRenderer';

export default function PostCard({ post }) {
  const { toggleLike, toggleBookmark } = usePostStore();
  const { patchFeedItem } = useFeedStore();
  const { user: currentUser } = useAuthStore();
  const { followUser, unfollowUser, getFollowing, followingByUser, followPending } = useSocialStore();

  // 🔁 local mirror so UI updates instantly
  const [p, setP] = useState(post);
  useEffect(() => setP(post), [post]);

  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  const isOwnPost = currentUser?.id === p.author.id;

  // Following cache
  const myKey = String(currentUser?.id || '');
  const myFollowing = followingByUser[myKey]?.items || [];
  const cachedFollowing = useMemo(() => new Set(myFollowing.map((u) => u.id)), [myFollowing]);
  const isFollowing = cachedFollowing.has(p.author.id) || !!p.author.isFollowing;

  useEffect(() => {
    if (!currentUser?.id) return;
    if (!followingByUser[myKey]?.items) {
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    }
  }, [currentUser?.id]);

  const handleLike = async () => {
    if (likePending) return;
    setLikePending(true);
    try {
      // optimistic
      const nextLiked = !p.isLiked;
      const nextLikes = (p.likesCount || 0) + (nextLiked ? 1 : -1);
      setP((old) => ({ ...old, isLiked: nextLiked, likesCount: Math.max(0, nextLikes) }));

      const res = await toggleLike(p.id); // expects {isLiked, likesCount}
      // sync with backend result
      setP((old) => ({ ...old, isLiked: res.isLiked, likesCount: res.likesCount }));
      patchFeedItem(p.id, { isLiked: res.isLiked, likesCount: res.likesCount });
    } catch {
      // revert on error (optional: refetch)
      setP(post);
    } finally {
      setLikePending(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarkPending) return;
    setBookmarkPending(true);
    try {
      // optimistic
      const nextBookmarked = !p.isBookmarked;
      setP((old) => ({ ...old, isBookmarked: nextBookmarked }));

      const res = await toggleBookmark(p.id); // expects {isBookmarked} (optionally bookmarksCount)
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
  };

  const onFollow = async () => {
    try {
      await followUser(p.author.id);
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const onUnfollow = async () => {
    setConfirmUnfollow(false);
    await unfollowUser(p.author.id);
    getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
  };

  const contentPreview =
    p.content?.length > 200 ? `${p.content.substring(0, 200)}...` : p.content;

  const looksLikeVideo = (url) =>
    typeof url === 'string' && /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(url);
  const isVideo = p?.type === 'VIDEO' || looksLikeVideo(p?.mediaUrl);

  const profileHref = p?.author?.username ? `/u/${p.author.username}` : `/users/${p.author.id}`;

  // 🔼 helpers to keep comment count in sync with Comments component
  const bumpComments = (delta = 1) =>
    setP((old) => ({ ...old, commentsCount: Math.max(0, (old.commentsCount || 0) + delta) }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6">
      <Card className="bg-card border-border overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 flex items-center justify-between">
          <Link href={profileHref} className="flex items-center space-x-3 group/author truncate">
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
              <AvatarImage src={p.author.avatar} />
              <AvatarFallback>{p.author.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="truncate">
              <p className="font-semibold text-foreground truncate group-hover/author:underline">
                {p.author.username}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {!isOwnPost && (
              isFollowing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setConfirmUnfollow(true)}
                  disabled={followPending[String(p.author.id)]}
                >
                  {followPending[String(p.author.id)] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Following'}
                </Button>
              ) : (
                <Button size="sm" onClick={onFollow} disabled={followPending[String(p.author.id)]}>
                  {followPending[String(p.author.id)] ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Follow'}
                </Button>
              )
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwnPost ? (
                  <>
                    <DropdownMenuItem>Edit post</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete post</DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem>Report post</DropdownMenuItem>
                    <DropdownMenuItem>Hide post</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        {p.title && (
          <div className="px-3 sm:px-4 pb-2">
            <h3 className="text-base sm:text-lg font-semibold text-foreground break-words">{p.title}</h3>
          </div>
        )}

        {/* Media */}
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

        {/* Content */}
        {p.content && (
          <div className="px-3 sm:px-4 py-2">
            <p className={`text-sm sm:text-base text-foreground leading-relaxed ${!showFullContent ? 'line-clamp-3 sm:line-clamp-none' : ''}`}>
              {showFullContent ? p.content : contentPreview}
            </p>
            {p.content.length > 200 && (
              <button
                onClick={() => setShowFullContent(!showFullContent)}
                className="mt-1 text-primary hover:underline text-sm font-medium"
              >
                {showFullContent ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {!!p.tags?.length && (
          <div className="px-3 sm:px-4 pb-3">
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

        {/* Actions */}
        <div className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleLike} className="flex items-center space-x-2 group" disabled={likePending}>
                {likePending ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <motion.div animate={p.isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                    <Heart className={`w-6 h-6 transition-colors ${p.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-500'}`} />
                  </motion.div>
                )}
                <span className="text-sm font-medium">{p.likesCount}</span>
              </motion.button>

              <button className="flex items-center space-x-2 group" onClick={() => setShowComments((s) => !s)}>
                <MessageCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{p.commentsCount || 0}</span>
              </button>

              <button className="flex items-center space-x-2 group">
                <Share className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={handleBookmark} className="group" disabled={bookmarkPending}>
              {bookmarkPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Bookmark className={`w-6 h-6 transition-colors ${p.isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Comments */}
        {showComments && (
          <Comments
            postId={p.id}
            // ⬇️ let child notify parent to keep count accurate
            onAdded={() => bumpComments(1)}
            onDeleted={() => bumpComments(-1)}
          />
        )}
      </Card>

      {/* Unfollow Confirm */}
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
