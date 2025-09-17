"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useSocialStore } from "@/store/socialStore";
import { usePostStore } from "@/store/postStore";

/** derive normalized flags if backend doesn't send them */
function deriveCanViewContent(profile, currentUserId) {
  if (!profile) return false;
  const isMe = profile.id === currentUserId;
  const isPublic = !!profile.isPublic;
  const followStatus = profile.followStatus || (profile.isFollowing ? "ACCEPTED" : "NONE");
  if (typeof profile.canViewContent === "boolean") return profile.canViewContent;
  return isMe || isPublic || followStatus === "ACCEPTED";
}
function normalizeFollowStatus(profile) {
  if (profile.followStatus) return profile.followStatus;
  if (profile.isFollowing) return "ACCEPTED";
  if (profile.isRequested) return "PENDING";
  return "NONE";
}

export default function ProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const { followUser, unfollowUser, getFollowers, getFollowing, followersByUser, followingByUser } =
    useSocialStore();

  const { fetchByAuthor, byAuthor, resetAuthorList } = usePostStore();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // dialogs
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);

  const isMe = profile?.id && profile.id === currentUser?.id;

  const headerCounts = {
    posts: profile?._count?.posts ?? 0,
    followers: profile?._count?.followers ?? 0,
    following: profile?._count?.following ?? 0,
  };

  // Make UI text resilient to backend fields
  const followStatus = useMemo(() => normalizeFollowStatus(profile || {}), [profile]);
  const followButtonText = useMemo(() => {
    if (followStatus === "ACCEPTED") return "Following";
    if (followStatus === "PENDING") return "Requested";
    return "Follow";
  }, [followStatus]);

  const canViewContent = deriveCanViewContent(profile, currentUser?.id);

  // Posts from store bucket
  const authorBucket = profile?.id ? byAuthor[String(profile.id)] : null;
  const posts = authorBucket?.items || [];
  const postsLoading = authorBucket?.isLoading;

  // followers/following buckets
  const followersBucket = profile?.id ? followersByUser[profile.id] : null;
  const followingBucket = profile?.id ? followingByUser[profile.id] : null;

  // load profile, then posts via store if allowed
  useEffect(() => {
    if (!username) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/username/${username}`);
        const data = res.data || {};
        const normalized = { ...data, followStatus: normalizeFollowStatus(data) };
        normalized.canViewContent = deriveCanViewContent(normalized, currentUser?.id);
        setProfile(normalized);

        if (normalized.canViewContent && normalized.id) {
          await fetchByAuthor(normalized.id, { page: 1, limit: 24 });
        } else if (normalized.id) {
          resetAuthorList(normalized.id);
        }
      } catch (err) {
        setError("User profile not found");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, currentUser?.id]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      setActionLoading(true);

      if (followStatus === "ACCEPTED") {
        // Unfollow
        await unfollowUser(profile.id);
        setProfile((p) => {
          const stillVisible = p?.isPublic || p?.id === currentUser?.id;
          return { ...p, followStatus: "NONE", canViewContent: stillVisible };
        });
        if (!(profile.isPublic || isMe)) {
          resetAuthorList(profile.id);
        }
        return;
      }

      if (followStatus === "PENDING") return; // already requested

      // NONE or DECLINED → try to follow
      const res = await followUser(profile.id); // { status: 'ACCEPTED'|'PENDING' }
      const nextStatus = res?.status || "PENDING";

      setProfile((p) => {
        const nextCanView =
          nextStatus === "ACCEPTED" ? true : p?.isPublic ? true : p?.id === currentUser?.id;
        return { ...p, followStatus: nextStatus, canViewContent: nextCanView };
      });

      if (nextStatus === "ACCEPTED") {
        await fetchByAuthor(profile.id, { page: 1, limit: 24 });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // open followers/following dialogs only if viewer can see them (public/self/accepted)
  const canSeeLists = canViewContent; // backend gates lists with same rule
  const openFollowers = async () => {
    if (!canSeeLists || !profile?.id) return;
    await getFollowers(profile.id, { page: 1, limit: 20 });
    setFollowersOpen(true);
  };
  const openFollowing = async () => {
    if (!canSeeLists || !profile?.id) return;
    await getFollowing(profile.id, { page: 1, limit: 20 });
    setFollowingOpen(true);
  };

  const loadMoreFollowers = async () => {
    if (!profile?.id) return;
    const page = (followersBucket?.page || 1) + 1;
    const limit = followersBucket?.limit || 20;
    const total = followersBucket?.total || 0;
    const loaded = followersBucket?.items?.length || 0;
    if (loaded >= total) return;
    await getFollowers(profile.id, { page, limit });
  };

  const loadMoreFollowing = async () => {
    if (!profile?.id) return;
    const page = (followingBucket?.page || 1) + 1;
    const limit = followingBucket?.limit || 20;
    const total = followingBucket?.total || 0;
    const loaded = followingBucket?.items?.length || 0;
    if (loaded >= total) return;
    await getFollowing(profile.id, { page, limit });
  };

  // click post → go to post page (adjust route to your app if different)
  const goToPost = (postId) => router.push(`/post/${postId}`);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-semibold">{error || "User not found"}</p>
      </div>
    );
  }

  const followersHasMore =
    (followersBucket?.items?.length || 0) < (followersBucket?.total || 0);
  const followingHasMore =
    (followingBucket?.items?.length || 0) < (followingBucket?.total || 0);

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center space-x-6">
        <Image
          src={profile.avatar || "/default-avatar.png"}
          alt={profile.username}
          width={80}
          height={80}
          className="rounded-full object-cover"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{profile.username}</h2>
          <p className="text-muted-foreground">{profile.bio || ""}</p>

          <div className="flex space-x-6 mt-2">
            <span>
              <strong>{headerCounts.posts}</strong> posts
            </span>
            {canSeeLists ? (
              <>
                <button
                  className="text-left hover:underline"
                  onClick={openFollowers}
                  type="button"
                >
                  <strong>{headerCounts.followers}</strong> followers
                </button>
                <button
                  className="text-left hover:underline"
                  onClick={openFollowing}
                  type="button"
                >
                  <strong>{headerCounts.following}</strong> following
                </button>
              </>
            ) : (
              <>
                <span>
                  <strong>{headerCounts.followers}</strong> followers
                </span>
                <span>
                  <strong>{headerCounts.following}</strong> following
                </span>
              </>
            )}
          </div>

          <div className="flex space-x-2 mt-3">
            {isMe ? (
              <Button onClick={() => router.push("/settings/profile")}>Edit Profile</Button>
            ) : (
              <>
                <Button variant="default" disabled={actionLoading} onClick={handleFollow}>
                  {followButtonText}
                </Button>
                {followStatus === "ACCEPTED" && (
                  <Button variant="outline" onClick={() => router.push(`/messages/${profile.id}`)}>
                    Message
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {canViewContent ? (
          postsLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="overflow-hidden hover:opacity-90 transition cursor-pointer"
                  onClick={() => goToPost(post.id)} // ← open the post page
                >
                  <CardContent className="p-0">
                    <Image
                      src={post.mediaUrl || "/placeholder.png"}
                      alt="Post"
                      width={400}
                      height={400}
                      className="w-full h-40 object-cover"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center py-20">
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold">This account is private</p>
            <p className="text-sm text-muted-foreground">Follow to see their posts and updates.</p>
          </div>
        )}
      </div>

      {/* Followers Dialog */}
      <Dialog open={followersOpen} onOpenChange={setFollowersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <ul className="divide-y">
              {(followersBucket?.items || []).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between py-3"
                  onClick={() => router.push(`/u/${u.username}`)}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <Image
                      src={u.avatar || "/default-avatar.png"}
                      alt={u.username}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      {u.bio && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {u.bio}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {followersHasMore && (
              <div className="flex justify-center mt-3">
                <Button size="sm" variant="outline" onClick={loadMoreFollowers}>
                  Load more
                </Button>
              </div>
            )}
            {!followersBucket?.items?.length && (
              <div className="text-center py-6 text-muted-foreground">No followers yet</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={followingOpen} onOpenChange={setFollowingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <ul className="divide-y">
              {(followingBucket?.items || []).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between py-3"
                  onClick={() => router.push(`/u/${u.username}`)}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <Image
                      src={u.avatar || "/default-avatar.png"}
                      alt={u.username}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{u.username}</span>
                      {u.bio && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {u.bio}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {followingHasMore && (
              <div className="flex justify-center mt-3">
                <Button size="sm" variant="outline" onClick={loadMoreFollowing}>
                  Load more
                </Button>
              </div>
            )}
            {!followingBucket?.items?.length && (
              <div className="text-center py-6 text-muted-foreground">Not following anyone yet</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
