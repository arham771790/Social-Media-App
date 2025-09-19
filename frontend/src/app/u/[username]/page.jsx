"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

  const followStatus = useMemo(() => normalizeFollowStatus(profile || {}), [profile]);
  const followButtonText = useMemo(() => {
    if (followStatus === "ACCEPTED") return "Following";
    if (followStatus === "PENDING") return "Requested";
    return "Follow";
  }, [followStatus]);

  const canViewContent = deriveCanViewContent(profile, currentUser?.id);

  const authorBucket = profile?.id ? byAuthor[String(profile.id)] : null;
  const posts = authorBucket?.items || [];
  const postsLoading = authorBucket?.isLoading;

  const followersBucket = profile?.id ? followersByUser[profile.id] : null;
  const followingBucket = profile?.id ? followingByUser[profile.id] : null;

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
  }, [username, currentUser?.id]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      setActionLoading(true);

      if (followStatus === "ACCEPTED") {
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

      if (followStatus === "PENDING") return;

      const res = await followUser(profile.id);
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

  const canSeeLists = canViewContent;
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

  const goToPost = (postId) => router.push(`/post/${postId}`);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-foreground via-foreground to-muted-foreground/10 text-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="animate-pulse">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-32 h-32 bg-muted-foreground rounded-full" />
              <div className="space-y-3">
                <div className="h-8 bg-muted-foreground rounded w-48" />
                <div className="h-4 bg-muted-foreground rounded w-64" />
                <div className="h-4 bg-muted-foreground rounded w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted-foreground rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-background">
        <p className="text-lg font-semibold">{error || "User not found"}</p>
      </div>
    );
  }

  const followersHasMore =
    (followersBucket?.items?.length || 0) < (followersBucket?.total || 0);
  const followingHasMore =
    (followingBucket?.items?.length || 0) < (followingBucket?.total || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-foreground via-foreground to-muted-foreground/10 text-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <Card className="mb-8 overflow-hidden border-0 shadow-xl bg-gradient-to-br from-foreground/80 to-foreground/50 backdrop-blur-sm text-background">
          <div className="p-6 lg:p-8 flex items-center space-x-6">
            <Image
              src={profile.avatar || "/default-avatar.png"}
              alt={profile.username}
              width={80}
              height={80}
              className="rounded-full object-cover ring-4 ring-muted-foreground/30 shadow-lg"
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold">@{profile.username}</h2>
              <p className="text-muted">{profile.bio || ""}</p>

              <div className="flex space-x-6 mt-2 text-sm">
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
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/messages/${profile.id}`)}
                      >
                        Message
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="mt-3">
                <Badge
                  variant={profile.isPublic ? "default" : "secondary"}
                  className="px-3 py-1 text-xs font-medium"
                >
                  {profile.isPublic ? "🌐 Public" : "🔒 Private"} Account
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Content */}
        <div className="mt-8">
          {canViewContent ? (
            postsLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl bg-muted-foreground" />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {posts.map((post, index) => (
                  <Card
                    key={post.id}
                    className="overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition cursor-pointer bg-foreground text-background"
                    onClick={() => goToPost(post.id)}
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: "fadeInUp 0.4s ease-out forwards",
                    }}
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
                <p className="text-muted">No posts yet</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-semibold">This account is private</p>
              <p className="text-sm text-muted">Follow to see their posts and updates.</p>
            </div>
          )}
        </div>

        {/* Followers Dialog */}
        <Dialog open={followersOpen} onOpenChange={setFollowersOpen}>
          <DialogContent className="sm:max-w-md bg-foreground text-background">
            <DialogHeader>
              <DialogTitle>Followers</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-3">
              <ul className="divide-y divide-muted-foreground/30">
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
                        <span className="font-medium">@{u.username}</span>
                        {u.bio && (
                          <span className="text-xs text-muted line-clamp-1">{u.bio}</span>
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
                <div className="text-center py-6 text-muted">No followers yet</div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Following Dialog */}
        <Dialog open={followingOpen} onOpenChange={setFollowingOpen}>
          <DialogContent className="sm:max-w-md bg-foreground text-background">
            <DialogHeader>
              <DialogTitle>Following</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-3">
              <ul className="divide-y divide-muted-foreground/30">
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
                        <span className="font-medium">@{u.username}</span>
                        {u.bio && (
                          <span className="text-xs text-muted line-clamp-1">{u.bio}</span>
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
                <div className="text-center py-6 text-muted">Not following anyone yet</div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
