// src/components/social/SocialListDialog.jsx
"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useSocialStore } from "@/store/socialStore";

export default function SocialListDialog({
  userId,
  mode = "followers", // "followers" | "following"
  open,
  onOpenChange,
  pageSize = 30,
  title,
}) {
  const { user: me } = useAuthStore();
  const {
    getFollowers,
    getFollowing,
    followersByUser,
    followingByUser,
    followUser,
    unfollowUser,
    followPending,
  } = useSocialStore();

  // hydrate when opened
  useEffect(() => {
    if (!open || !userId) return;
    if (mode === "followers") {
      getFollowers(userId, { page: 1, limit: pageSize }).catch(() => {});
    } else {
      getFollowing(userId, { page: 1, limit: pageSize }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, mode]);

  const key = String(userId);
  const myKey = String(me?.id || "");

  const bucket = mode === "followers" ? followersByUser[key] : followingByUser[key];
  const items = bucket?.items || [];
  const pagination = bucket?.pagination || { page: 1, pages: 1, total: 0, limit: pageSize };
  const isLoading = bucket?.isLoading || false;

  // for showing follow state per row (against MY following cache)
  const myFollowing = (followingByUser[myKey]?.items || []).map((u) => u.id);
  const myFollowingSet = useMemo(() => new Set(myFollowing), [myFollowing]);

  const loadMore = () => {
    if (isLoading) return;
    const next = (pagination.page || 1) + 1;
    if (next > (pagination.pages || 1)) return;
    if (mode === "followers") getFollowers(userId, { page: next, limit: pageSize }).catch(() => {});
    else getFollowing(userId, { page: next, limit: pageSize }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{title || (mode === "followers" ? "Followers" : "Following")}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading && items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((u) => {
                const isMe = me?.id === u.id;
                const iFollow = myFollowingSet.has(u.id);
                return (
                  <li key={u.id} className="px-6 py-3 flex items-center gap-3">
                    <Link href={`/u/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={u.avatar || undefined} />
                        <AvatarFallback>{u.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">@{u.username}</div>
                        {u.bio && <div className="text-xs text-muted-foreground truncate">{u.bio}</div>}
                      </div>
                    </Link>

                    {!isMe && (
                      iFollow ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => unfollowUser(u.id).catch(() => {})}
                          disabled={!!followPending[String(u.id)]}
                        >
                          Following
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => followUser(u.id).then(() => {
                            // refresh my following cache so buttons update across the app
                            if (me?.id) {
                              getFollowing(me.id, { page: 1, limit: 100 }).catch(() => {});
                            }
                          }).catch(() => {})}
                          disabled={!!followPending[String(u.id)]}
                        >
                          Follow
                        </Button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {pagination.page < (pagination.pages || 1) && (
          <div className="p-4 border-t flex justify-center">
            <Button variant="outline" onClick={loadMore} disabled={isLoading}>
              {isLoading ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
