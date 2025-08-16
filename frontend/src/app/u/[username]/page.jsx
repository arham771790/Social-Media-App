// src/app/u/[username]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { useUserStore } from "@/store/userStore";
import { useSocialStore } from "@/store/socialStore";
import { usePostStore } from "@/store/postStore";
import SocialListDialog from "@/components/social/SocialListDialog";

/** Tiny inline spinner for buttons / subtle loads */
function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function UserProfilePage() {
  const { username } = useParams();

  // Stores
  const { user: me } = useAuthStore();

  const {
    searchUsers,
    fetchUserById,
    selectedUser,
    isLoading: userLoading,
  } = useUserStore();

  const {
    getFollowers,
    getFollowing,
    followersByUser,
    followingByUser,
    followUser,
    unfollowUser,
    followPending,          // { [userId]: true } while a follow/unfollow request in flight
    relationshipByUser,     // OPTIONAL: { [userId]: "FOLLOWING"|"REQUESTED"|"NONE" } if your store exposes it
  } = useSocialStore();

  const { byAuthor, fetchByAuthor } = usePostStore();

  // Local UI state
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [userId, setUserId] = useState(null);

  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [confirmUnfollow, setConfirmUnfollow] = useState(false);

  // Resolve username -> id and hydrate page via STORES ONLY
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPageLoading(true);
      setPageError(null);
      setUserId(null);

      try {
        const s = await searchUsers({ q: String(username), page: 1, limit: 1 });
        const match = (s?.users || [])[0];
        if (!match) {
          if (!cancelled) {
            setPageError("User not found");
            setPageLoading(false);
          }
          return;
        }

        const id = match.id;
        setUserId(id);

        // kick off parallel store fetches
        await Promise.allSettled([
          fetchUserById(id),
          getFollowers(id, { page: 1, limit: 1 }), // just to get totals quickly
          getFollowing(id, { page: 1, limit: 1 }),
          fetchByAuthor(id, { page: 1, limit: 24 }),
          me?.id ? getFollowing(me.id, { page: 1, limit: 100 }) : Promise.resolve(),
        ]);

        if (!cancelled) setPageLoading(false);
      } catch (e) {
        if (!cancelled) {
          setPageError("Failed to load profile");
          setPageLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, me?.id]);

  const profile = userId && selectedUser?.id === userId ? selectedUser : null;

  // Posts bucket for this user
  const postsBucket = userId ? byAuthor[userId] : null;
  const posts = postsBucket?.items || [];
  const postsTotal =
    postsBucket?.pagination?.total ??
    profile?._count?.posts ??
    posts.length;

  // Totals from social store (fallback to profile._count if present)
  const followersTotal =
    (userId && followersByUser[userId]?.pagination?.total) ??
    profile?._count?.followers ??
    0;

  const followingTotal =
    (userId && followingByUser[userId]?.pagination?.total) ??
    profile?._count?.following ??
    0;

  const isMe = !!(me?.id && userId && me.id === userId);

  // Relationship state:
  // 1) Prefer store relationship map if available (FOLLOWING/REQUESTED/NONE)
  // 2) Fallback to computing from my following list (legacy path)
  const relFromMap = relationshipByUser?.[String(userId)];
  const iFollow = useMemo(() => {
    if (relFromMap) return relFromMap === "FOLLOWING";
    if (!me?.id || !userId) return false;
    const myFollowing = followingByUser[String(me.id)]?.items || [];
    const set = new Set(myFollowing.map((u) => u.id));
    return set.has(userId);
  }, [relFromMap, me?.id, userId, followingByUser]);

  const requested = useMemo(() => {
    if (relFromMap) return relFromMap === "REQUESTED";
    // Heuristic: if profile is private & not following & I recently pressed follow (pending)
    return !!followPending[String(userId)] && profile?.isPublic === false && !iFollow;
  }, [relFromMap, userId, followPending, profile?.isPublic, iFollow]);

  const busy = !!followPending[String(userId)];

  const onFollow = async () => {
    if (!userId || busy) return;
    try {
      await followUser(userId);
      // refresh my following + their followers count caches
      if (me?.id) getFollowing(me.id, { page: 1, limit: 100 }).catch(() => {});
      getFollowers(userId, { page: 1, limit: 1 }).catch(() => {});
    } catch (e) {
      // swallow; store should handle error state
    }
  };

  const onConfirmUnfollow = async () => {
    setConfirmUnfollow(false);
    if (!userId || busy) return;
    try {
      await unfollowUser(userId);
      if (me?.id) getFollowing(me.id, { page: 1, limit: 100 }).catch(() => {});
      getFollowers(userId, { page: 1, limit: 1 }).catch(() => {});
    } catch (e) {}
  };

  // Loading & error states
  if (pageLoading || userLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-6" aria-busy="true">
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-8" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (pageError || !profile) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">User not found</h2>
        <p className="text-muted-foreground">We couldn’t find @{username}.</p>
        <div className="mt-4">
          <Link href="/explore">
            <Button>Explore</Button>
          </Link>
        </div>
      </div>
    );
  }

  const loadMorePosts = () => {
    if (!postsBucket) return;
    fetchByAuthor(userId, {
      page: (postsBucket.pagination?.page || 1) + 1,
      limit: postsBucket.pagination?.limit || 24,
    }).catch(() => {});
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted">
          {profile.avatar ? (
            <Image src={profile.avatar} alt={profile.username} fill className="object-cover" />
          ) : (
            <div className="w-full h-full grid place-items-center text-xl">
              {profile.username?.[0]?.toUpperCase() || "U"}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">@{profile.username}</h1>

            {isMe ? (
              <Button size="sm" variant="secondary" asChild title="Edit profile">
                <Link href="/me">Edit profile</Link>
              </Button>
            ) : iFollow ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setConfirmUnfollow(true)}
                disabled={busy}
                title="You are following this user"
              >
                {busy ? <><Spinner className="w-4 h-4 mr-2" /> Updating…</> : "Following"}
              </Button>
            ) : requested ? (
              <Button size="sm" variant="secondary" disabled title="Follow request sent">
                Requested
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onFollow}
                disabled={busy}
                title={profile.isPublic ? "Follow user" : "Request to follow (private account)"}
              >
                {busy ? <><Spinner className="w-4 h-4 mr-2" /> Following…</> : "Follow"}
              </Button>
            )}
          </div>

          <p className="text-muted-foreground text-sm mt-1">
            {profile.bio || "No bio yet."}
          </p>

          {/* Stats (clickable) */}
          <div className="flex gap-6 mt-2 text-sm">
            <span>
              <strong>{postsTotal}</strong> posts
            </span>

            <button
              type="button"
              className="hover:underline"
              onClick={() => setFollowersOpen(true)}
              title="View followers"
            >
              <strong>{followersTotal}</strong> followers
            </button>

            <button
              type="button"
              className="hover:underline"
              onClick={() => setFollowingOpen(true)}
              title="View following"
            >
              <strong>{followingTotal}</strong> following
            </button>
          </div>
        </div>
      </div>

      {/* Posts grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No posts yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="relative w-full aspect-square bg-muted overflow-hidden"
                title={p.title || "View post"}
              >
                {p.type === "VIDEO" ||
                /\.(mp4|mov|webm|mkv|ogg)(\?|$)/i.test(p.mediaUrl || "") ? (
                  <video
                    src={p.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={p.thumbnailUrl || p.mediaUrl}
                    alt={p.title || "Post"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/400x400/111827/6B7280?text=No+Image";
                    }}
                  />
                )}
              </Link>
            ))}
          </div>
        )}

        {postsBucket?.hasMore && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={loadMorePosts}
              disabled={!!postsBucket?.isLoading}
              aria-busy={!!postsBucket?.isLoading}
            >
              {postsBucket?.isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Followers / Following dialogs */}
      {!!userId && (
        <>
          <SocialListDialog
            userId={userId}
            mode="followers"
            open={followersOpen}
            onOpenChange={setFollowersOpen}
            title={`Followers of @${profile.username}`}
          />
          <SocialListDialog
            userId={userId}
            mode="following"
            open={followingOpen}
            onOpenChange={setFollowingOpen}
            title={`@${profile.username} is following`}
          />
        </>
      )}

      {/* Unfollow confirm dialog */}
      <Dialog open={confirmUnfollow} onOpenChange={setConfirmUnfollow}>
        <DialogContent className="max-w-sm">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Unfollow @{profile.username}?</h3>
            <p className="text-sm text-muted-foreground">
              You’ll stop seeing their posts in your feed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setConfirmUnfollow(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={onConfirmUnfollow} disabled={busy}>
                {busy ? <><Spinner className="w-4 h-4 mr-2" /> Unfollowing…</> : "Unfollow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
