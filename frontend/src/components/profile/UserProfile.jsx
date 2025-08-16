// src/components/profile/UserProfile.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { useUserStore } from '@/store/userStore';
import { useSocialStore } from '@/store/socialStore';
import PostCard from '@/components/feed/PostCard';

export default function UserProfile({ userId }) {
  const { me, fetchMe } = useUserStore();
  const { user: currentUser } = useAuthStore();
  const {
    getFollowers,
    getFollowing,
    followersByUser,
    followingByUser,
    followUser,
    unfollowUser,
    followPending,
  } = useSocialStore();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState(null);

  // NEW: which dialog is open? 'followers' | 'following' | null
  const [openList, setOpenList] = useState(null);

  const isMe = currentUser?.id && user?.id && currentUser.id === user.id;
  const key = String(userId);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setLoadingUser(true);
        setError(null);

        // Profile
        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!resp.ok) throw new Error('Failed to fetch user');
        const data = await resp.json();
        if (ignore) return;
        setUser(data);

        // Posts by this user
        setLoadingPosts(true);
        const postsResp = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/posts?authorId=${userId}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        if (postsResp.ok) {
          const postsData = await postsResp.json();
          if (!ignore) setPosts(postsData.posts || postsData || []);
        } else {
          if (!ignore) setPosts([]);
        }

        // Followers/following first page (for counts & dialog initial)
        getFollowers(userId, { page: 1, limit: 30 }).catch(() => {});
        getFollowing(userId, { page: 1, limit: 30 }).catch(() => {});
      } catch (e) {
        if (!ignore) setError(e.message || 'Failed to load profile');
      } finally {
        if (!ignore) {
          setLoadingUser(false);
          setLoadingPosts(false);
        }
      }
    };

    load();
    if (!me) fetchMe().catch(() => {});
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const followersBucket = followersByUser[key] || { items: [], page: 0, hasMore: false, isLoading: false };
  const followingBucket = followingByUser[key] || { items: [], page: 0, hasMore: false, isLoading: false };

  const followers = followersBucket.items || [];
  const following = followingBucket.items || [];

  const iFollowThem = useMemo(() => {
    const myKey = String(currentUser?.id || '');
    const myFollowing = followingByUser[myKey]?.items || [];
    return new Set(myFollowing.map((u) => u.id)).has(userId);
  }, [currentUser?.id, followingByUser, userId]);

  const canSeeLists = isMe || user?.isPublic;

  const onFollow = async () => {
    try {
      await followUser(userId);
      if (currentUser?.id) {
        getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
      }
      getFollowers(userId, { page: 1, limit: 30 }).catch(() => {});
    } catch (e) {
      console.error(e);
    }
  };

  const onUnfollow = async () => {
    await unfollowUser(userId);
    if (currentUser?.id) {
      getFollowing(currentUser.id, { page: 1, limit: 100 }).catch(() => {});
    }
    getFollowers(userId, { page: 1, limit: 30 }).catch(() => {});
  };

  // ------- Dialog helpers -------
  const openFollowersDialog = () => setOpenList('followers');
  const openFollowingDialog = () => setOpenList('following');
  const closeDialog = () => setOpenList(null);

  const loadMoreFollowers = async () => {
    if (!followersBucket.hasMore || followersBucket.isLoading) return;
    await getFollowers(userId, { page: (followersBucket.page || 1) + 1, limit: 30 });
  };

  const loadMoreFollowing = async () => {
    if (!followingBucket.hasMore || followingBucket.isLoading) return;
    await getFollowing(userId, { page: (followingBucket.page || 1) + 1, limit: 30 });
  };

  if (loadingUser) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="p-6">Loading profile…</Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="p-6 text-destructive">{error}</Card>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex gap-4 items-start">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted">
            {user.avatar ? (
              <Image src={user.avatar} alt={user.username} fill className="object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xl">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">@{user.username}</h1>
              {isMe ? (
                <Button size="sm" variant="secondary" asChild>
                  <a href="/me">Edit profile</a>
                </Button>
              ) : iFollowThem ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onUnfollow}
                  disabled={followPending[String(userId)]}
                >
                  Following
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onFollow}
                  disabled={followPending[String(userId)]}
                >
                  Follow
                </Button>
              )}
            </div>

            {user.bio && <p className="text-sm text-muted-foreground mt-2">{user.bio}</p>}

            {/* Counts (clickable -> dialog) */}
            <div className="flex gap-6 mt-3 text-sm">
              <span><strong>{posts.length}</strong> posts</span>

              <button
                type="button"
                className="hover:underline"
                onClick={canSeeLists ? openFollowersDialog : undefined}
                disabled={!canSeeLists}
                title={canSeeLists ? 'View followers' : 'Private account'}
              >
                <strong>{followers.length}</strong> followers
              </button>

              <button
                type="button"
                className="hover:underline"
                onClick={canSeeLists ? openFollowingDialog : undefined}
                disabled={!canSeeLists}
                title={canSeeLists ? 'View following' : 'Private account'}
              >
                <strong>{following.length}</strong> following
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs (kept as-is) */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="followers">Followers</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
          {isMe && <TabsTrigger value="about">About</TabsTrigger>}
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {loadingPosts ? (
            <Card className="p-6">Loading posts…</Card>
          ) : posts.length === 0 ? (
            <Card className="p-6 text-muted-foreground">
              {isMe ? 'You have no posts yet.' : 'No posts yet.'}
            </Card>
          ) : (
            <div className="space-y-6">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="followers" className="mt-4">
          {!canSeeLists ? (
            <Card className="p-6 text-muted-foreground">This account is private.</Card>
          ) : followers.length === 0 ? (
            <Card className="p-6 text-muted-foreground">No followers yet.</Card>
          ) : (
            <Card className="p-4">
              <UserList
                items={followers}
                currentUserId={currentUser?.id}
                followPending={followPending}
                followUser={followUser}
                unfollowUser={unfollowUser}
              />
              {followersBucket.hasMore && (
                <div className="pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadMoreFollowers}
                    disabled={followersBucket.isLoading}
                  >
                    {followersBucket.isLoading ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="following" className="mt-4">
          {!canSeeLists ? (
            <Card className="p-6 text-muted-foreground">This account is private.</Card>
          ) : following.length === 0 ? (
            <Card className="p-6 text-muted-foreground">Not following anyone yet.</Card>
          ) : (
            <Card className="p-4">
              <UserList
                items={following}
                currentUserId={currentUser?.id}
                followPending={followPending}
                followUser={followUser}
                unfollowUser={unfollowUser}
              />
              {followingBucket.hasMore && (
                <div className="pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadMoreFollowing}
                    disabled={followingBucket.isLoading}
                  >
                    {followingBucket.isLoading ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {isMe && (
          <TabsContent value="about" className="mt-4">
            <Card className="p-6 space-y-3 text-sm text-muted-foreground">
              <p>Email: {me?.email}</p>
              <p>Public: {me?.isPublic ? 'Yes' : 'No'}</p>
              <div className="pt-2">
                <Button asChild size="sm">
                  <a href="/settings">Open settings</a>
                </Button>
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* -------- Dialog for Followers / Following -------- */}
      <Dialog open={!!openList} onOpenChange={(o) => (o ? null : closeDialog())}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>
              {openList === 'followers' ? 'Followers' : openList === 'following' ? 'Following' : ''}
            </DialogTitle>
          </DialogHeader>

          {!canSeeLists ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">This account is private.</div>
          ) : (
            <>
              <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
                <UserList
                  items={openList === 'followers' ? followers : following}
                  currentUserId={currentUser?.id}
                  followPending={followPending}
                  followUser={followUser}
                  unfollowUser={unfollowUser}
                />
              </div>

              <div className="px-6 pb-4">
                {openList === 'followers' && followersBucket.hasMore && (
                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    onClick={loadMoreFollowers}
                    disabled={followersBucket.isLoading}
                  >
                    {followersBucket.isLoading ? 'Loading…' : 'Load more'}
                  </Button>
                )}
                {openList === 'following' && followingBucket.hasMore && (
                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    onClick={loadMoreFollowing}
                    disabled={followingBucket.isLoading}
                  >
                    {followingBucket.isLoading ? 'Loading…' : 'Load more'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Small reusable list ---------- */
function UserList({ items, currentUserId, followPending, followUser, unfollowUser }) {
  if (!items?.length) {
    return <div className="px-6 py-4 text-sm text-muted-foreground">No users found.</div>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((u) => {
        const isSelf = currentUserId && u.id === currentUserId;
        const pendingKey = String(u.id);

        // If your API returns flags (isFollowing, isFollowedBy), you can use them here.
        // For now, we render a "View" link + an optional Follow/Unfollow action.
        return (
          <li key={u.id} className="py-3 px-4 flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={u.avatar || undefined} />
              <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <Link href={`/u/${u.username}`} className="font-medium hover:underline block truncate">
                @{u.username}
              </Link>
              {u.bio && (
                <p className="text-xs text-muted-foreground truncate">
                  {u.bio}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/u/${u.username}`}>
                <Button size="sm" variant="outline">View</Button>
              </Link>
              {!isSelf && (
                <Button
                  size="sm"
                  onClick={() => unfollowUser ? unfollowUser(u.id) : followUser(u.id)}
                  disabled={!!followPending[pendingKey]}
                >
                  {/* If you track isFollowing per item, swap label based on that */}
                  Follow / Unfollow
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
