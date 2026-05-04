// src/app/notifications/page.jsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { useSocialStore } from "@/store/socialStore";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  MessageSquare,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  Settings,
  Filter,
  Eye,
} from "lucide-react";

/* -----------------------------
   Helpers (icons, colors, utils)
-------------------------------*/
const typeIcon = (type) => {
  switch ((type || "").toUpperCase()) {
    case "FOLLOW":
      return <UserPlus className="w-4 h-4" />;
    case "FOLLOW_REQUEST":
      return <UserPlus className="w-4 h-4" />;
    case "FOLLOW_ACCEPTED":
      return <UserPlus className="w-4 h-4" />;
    case "LIKE":
      return <Heart className="w-4 h-4" />;
    case "COMMENT":
      return <MessageCircle className="w-4 h-4" />;
    case "REPLY":
      return <MessageSquare className="w-4 h-4" />;
    case "CALL":
      return <Phone className="w-4 h-4" />;
    case "GROUP_INVITE":
      return <Users className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

const getTypeColor = (type) => {
  switch ((type || "").toUpperCase()) {
    case "FOLLOW":
    case "FOLLOW_REQUEST":
    case "FOLLOW_ACCEPTED":
      return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "LIKE":
      return "bg-red-500/10 text-red-600 border-red-200";
    case "COMMENT":
    case "REPLY":
      return "bg-green-500/10 text-green-600 border-green-200";
    case "CALL":
      return "bg-purple-500/10 text-purple-600 border-purple-200";
    case "GROUP_INVITE":
      return "bg-orange-500/10 text-orange-600 border-orange-200";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200";
  }
};

const prettyMessage = (n) => {
  const t = (n.type || "").toUpperCase();
  if (t === "FOLLOW_REQUEST") return "sent you a follow request";
  if (t === "FOLLOW_ACCEPTED") return "accepted your follow request";
  if (t === "FOLLOW") return "started following you";
  if (t === "LIKE") return "liked your post";
  if (t === "COMMENT") return "commented on your post";
  if (t === "REPLY") return "replied to your comment";
  if (t === "GROUP_INVITE") return "invited you to join a group";
  return "You have a new notification";
};

const groupDateLabel = (date) => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d, yyyy");
};

const buildHref = (n) => {
  if (n.relatedPostId) return `/post/${n.relatedPostId}`;
  if (n.relatedUserUsername) return `/u/${n.relatedUserUsername}`;
  if (n.relatedUserId) return `/u/${n.relatedUserId}`;
  return "#";
};

const getInitials = (name) =>
  (name || "")
    .split(/\s+|_/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "?";

/* -----------------------------
   IntersectionObserver Hook
-------------------------------*/
function useInView(callback, options = { threshold: 0.6 }) {
  const observerRef = useRef(null);
  const cbRef = useRef(callback);

  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  const setNode = useCallback(
    (node) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) cbRef.current?.(entry.target);
        });
      }, options);

      observer.observe(node);
      observerRef.current = observer;
    },
    [options]
  );

  return setNode;
}

/* -----------------------------
   Page
-------------------------------*/
export default function NotificationsPage() {
  const { user } = useAuthStore();
  const {
    notifications: items,
    unreadCount,
    isLoading,
    isError,
    error,
    hasNextPage: hasMore,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    markRead,
    markAllRead,
    refetch,
  } = useNotifications(20);

  // Filters & search
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL | UNREAD | REQUESTS | LIKES | COMMENTS | FOLLOWS | OTHER

  // No manual fetch/bind needed, handled in hook

  // Infinite scroll: sentinel
  const sentinelRef = useRef(null);
  const onReachBottom = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchNextPage();
    }
  }, [hasMore, loadingMore, fetchNextPage]);

  const setSentinel = useInView(() => onReachBottom(), { threshold: 0.1 });

  useEffect(() => {
    if (sentinelRef.current) setSentinel(sentinelRef.current);
  }, [items.length, setSentinel]);

  // Filter + search
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = (n) => {
      const t = String(n.type || "").toUpperCase();
      const matchesType =
        typeFilter === "ALL" ||
        (typeFilter === "UNREAD" && !n.read) ||
        (typeFilter === "REQUESTS" && t === "FOLLOW_REQUEST") ||
        (typeFilter === "LIKES" && t === "LIKE") ||
        (typeFilter === "COMMENTS" && (t === "COMMENT" || t === "REPLY")) ||
        (typeFilter === "FOLLOWS" && (t === "FOLLOW" || t === "FOLLOW_ACCEPTED")) ||
        (typeFilter === "OTHER" &&
          !["FOLLOW", "FOLLOW_REQUEST", "FOLLOW_ACCEPTED", "LIKE", "COMMENT", "REPLY"].includes(t));

      if (!matchesType) return false;
      if (!q) return true;

      const hay =
        `${n.message || ""} ${n.type || ""} ${n.relatedUserUsername || ""} ${n.relatedUserId || ""}`.toLowerCase();
      return hay.includes(q);
    };
    return items.filter(f);
  }, [items, query, typeFilter]);

  // Group by day label
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((n) => {
      const d = n.createdAt ? new Date(n.createdAt) : new Date();
      const label = groupDateLabel(d);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(n);
    });
    // keep each group order (items are already newest-first)
    return Array.from(map.entries());
  }, [filtered]);

  const onMarkAll = async () => {
    markAllRead();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">Stay updated with your latest activities</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">{unreadCount} new</span>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkAll}
                disabled={unreadCount === 0}
                className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              >
                Mark all read
              </Button>
              <Button size="sm" variant="ghost" className="p-2">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {[
              ["ALL", "All"],
              ["UNREAD", "Unread"],
              ["REQUESTS", "Requests"],
              ["LIKES", "Likes"],
              ["COMMENTS", "Comments"],
              ["FOLLOWS", "Follows"],
              ["OTHER", "Other"],
            ].map(([key, label]) => {
              const active = typeFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setTypeFilter(key)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition ${
                    active
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "text-muted-foreground hover:bg-muted/50 border-transparent"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-64">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications…"
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {isLoading && items.length === 0 ? (
            <Card className="overflow-hidden">
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-muted animate-pulse" />
                <div className="space-y-2">
                  <div className="h-4 w-32 mx-auto bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 mx-auto bg-muted rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ) : error ? (
            <Card className="border-destructive/20 bg-destructive/5">
              <div className="p-8 text-center space-y-3">
                <XCircle className="w-12 h-12 mx-auto text-destructive/60" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Something went wrong</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="border-destructive/30 hover:bg-destructive/10"
                >
                  Try again
                </Button>
              </div>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="overflow-hidden">
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">All caught up!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    No notifications match your filters.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            grouped.map(([label, rows]) => (
              <section key={label} aria-labelledby={`group-${label}`}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/80 mb-2">
                  {label}
                </div>
                <Card className="overflow-hidden shadow-sm border-0 bg-card/50 backdrop-blur-sm">
                  <div className="divide-y divide-border/50">
                    {rows.map((n) => (
                      <NotificationRow key={n.id} n={n} onSeen={() => markRead(n.id)} />
                    ))}
                  </div>
                </Card>
              </section>
            ))
          )}

          {/* Infinite scroll sentinel + fallback button */}
          {filtered.length > 0 && (
            <div className="flex flex-col items-center py-4">
              {hasMore && (
                <div
                  ref={(node) => {
                    sentinelRef.current = node;
                    setSentinel(node);
                  }}
                  className="h-6"
                />
              )}
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={loadingMore}
                  className="hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
   Row
-------------------------------*/
function NotificationRow({ n, onSeen }) {
  const isFollowReq = String(n.type).toUpperCase() === "FOLLOW_REQUEST" && n.relatedUserId;
  const when = n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "";

  const href = buildHref(n);

  // auto mark read when ~60% visible
  const rowRef = useRef(null);
  const setInView = useInView((node) => {
    if (!n.read) onSeen?.();
  }, { threshold: 0.6 });

  useEffect(() => {
    if (rowRef.current) setInView(rowRef.current);
  }, [rowRef.current, setInView]);

  const rowClass = n.read
    ? "hover:bg-muted/30"
    : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary/30";

  const titleClass = n.read ? "text-muted-foreground" : "font-medium text-foreground";
  const metaClass = "text-xs text-muted-foreground/80";

  // Avatar: You could enrich related user avatar in backend later; safe fallback now
  const actorName = n.relatedUserUsername || "Someone";
  const avatarSrc = n.relatedUserAvatar || null;

  return (
    <div
      ref={rowRef}
      className={`group relative p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 transition-all duration-200 ${rowClass}`}
      role="article"
      aria-live="polite"
    >
      {/* Leading icon */}
      <div
        className={`relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${getTypeColor(
          n.type
        )} group-hover:scale-105`}
        aria-hidden="true"
      >
        {typeIcon(n.type)}
        {!n.read && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        )}
      </div>

      {/* Avatar + content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-8 h-8">
            <AvatarImage src={avatarSrc || ""} alt={actorName} />
            <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
          </Avatar>
          <div className={`text-sm sm:text-base leading-relaxed ${titleClass}`}>
            {n.message || prettyMessage(n)}
          </div>
        </div>

        <div className={`flex items-center gap-2 ${metaClass}`}>
          <span>{when}</span>
          {!n.read && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
              New
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {isFollowReq ? (
          <FollowRequestActions followerId={n.relatedUserId} />
        ) : (
          <Link
            href={href}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            aria-label="View"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
        )}
      </div>
    </div>
  );
}

/* -----------------------------
   Follow Request Actions
-------------------------------*/
function FollowRequestActions({ followerId }) {
  const accept = useSocialStore((s) => s.acceptFollowRequest);
  const decline = useSocialStore((s) => s.declineFollowRequest);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const onAccept = async () => {
    if (busy || result) return;
    setBusy(true);
    try {
      await accept(followerId);
      setResult("accepted");
    } catch (error) {
      console.error("Failed to accept follow request:", error);
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (busy || result) return;
    setBusy(true);
    try {
      await decline(followerId);
      setResult("declined");
    } catch (error) {
      console.error("Failed to decline follow request:", error);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {result === "accepted" ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            Accepted
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-600">
            <XCircle className="w-3 h-3" />
            Declined
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <Button
        size="sm"
        onClick={onAccept}
        disabled={busy}
        className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm min-w-[70px]"
      >
        {busy ? (
          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Accept
          </>
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onDecline}
        disabled={busy}
        className="border-gray-300 hover:bg-gray-50 hover:border-gray-400 min-w-[70px]"
      >
        {busy ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Decline
          </>
        )}
      </Button>
    </div>
  );
}

/* -----------------------------
   Tiny CSS for subtle fade-in (optional)
-------------------------------*/
const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = styles;
  document.head.appendChild(style);
}
