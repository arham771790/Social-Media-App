'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from 'lucide-react';
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

  const [showFullContent, setShowFullContent] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  const isOwnPost = currentUser?.id === post.author.id;

  // derive following state from store cache (my following list)
  const myKey = String(currentUser?.id || '');
  const myFollowing = followingByUser[myKey]?.items || [];
  const cachedFollowing = useMemo(() => new Set(myFollowing.map((u) => u.id)), [myFollowing]);
  const isFollowing = cachedFollowing.has(post.author.id) || !!post.author.isFollowing;

  useEffect(() => {
    if (!currentUser?.id) return;
    if (!followingByUser[myKey]?.items) {
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleLike = async () => {
    const res = await toggleLike(post.id);
    patchFeedItem(post.id, { isLiked: res.isLiked, likesCount: res.likesCount });
  };

  const handleBookmark = async () => {
    const res = await toggleBookmark(post.id);
    patchFeedItem(post.id, { isBookmarked: res.isBookmarked });
  };

  const onFollow = async () => {
    try {
      await followUser(post.author.id);
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    } catch (e) {
      // 403 when target is private with current backend — you can toast here if you have a toaster
      console.error(e);
    }
  };

  const onUnfollow = async () => {
    setConfirmUnfollow(false);
    await unfollowUser(post.author.id);
    getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
  };

  const contentPreview =
    post.content?.length > 200 ? `${post.content.substring(0, 200)}...` : post.content;

  // robust video detection (works even if backend didn’t set type)
  const looksLikeVideo = (url) =>
    typeof url === 'string' && /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(url);
  const isVideo = post?.type === 'VIDEO' || looksLikeVideo(post?.mediaUrl);

  const profileHref = post?.author?.username
    ? `/u/${post.author.username}`
    : `/users/${post.author.id}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-6">
      <Card className="bg-card border-border overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          {/* Make author block clickable */}
          <Link
            href={profileHref}
            className="flex items-center space-x-3 group/author"
            aria-label={`Go to @${post?.author?.username || 'user'}'s profile`}
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>{post.author.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground group-hover/author:underline">
                {post.author.username}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
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
                  disabled={followPending[String(post.author.id)]}
                >
                  Following
                </Button>
              ) : (
                <Button size="sm" onClick={onFollow} disabled={followPending[String(post.author.id)]}>
                  Follow
                </Button>
              )
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Post options">
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
        {post.title && (
          <div className="px-4 pb-2">
            <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
          </div>
        )}

        {/* Media (image or video) */}
        {post.mediaUrl && (
          <MediaRenderer
            className="w-full max-h-[600px] bg-muted"
            media={[
              {
                url: post.mediaUrl,
                type: isVideo ? 'video' : 'image',
                thumbnail: post.thumbnailUrl || undefined,
              },
            ]}
          />
        )}

        {/* Content */}
        {post.content && (
          <div className="px-4 py-2">
            <p className="text-foreground leading-relaxed">
              {showFullContent ? post.content : contentPreview}
              {post.content.length > 200 && (
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="ml-2 text-primary hover:underline text-sm font-medium"
                >
                  {showFullContent ? 'Show less' : 'Show more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Tags */}
        {!!post.tags?.length && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {post.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{post.tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleLike} className="flex items-center space-x-2 group">
                <motion.div animate={post.isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                  <Heart className={`w-6 h-6 transition-colors ${post.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:text-red-500'}`} />
                </motion.div>
                <span className="text-sm font-medium">{post.likesCount}</span>
              </motion.button>

              <button className="flex items-center space-x-2 group" onClick={() => setShowComments((s) => !s)}>
                <MessageCircle className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium">{post.commentsCount || 0}</span>
              </button>

              <button className="flex items-center space-x-2 group">
                <Share className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>

            <motion.button whileTap={{ scale: 0.95 }} onClick={handleBookmark} className="group">
              <Bookmark className={`w-6 h-6 transition-colors ${post.isBookmarked ? 'fill-primary text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
            </motion.button>
          </div>
        </div>

        {/* Comments */}
        {showComments && <Comments postId={post.id} />}
      </Card>

      {/* Unfollow confirm */}
      <Dialog open={confirmUnfollow} onOpenChange={setConfirmUnfollow}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Unfollow @{post.author.username}?</h3>
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
