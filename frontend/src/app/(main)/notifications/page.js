// src/app/notifications/page.jsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useNotificationStore } from "@/store/notificationStore";
import { useAuthStore } from "@/store/authStore";
import { useSocialStore } from "@/store/socialStore"; // ⬅️ uses your existing social store
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";

const typeIcon = (type) => {
  switch ((type || "").toUpperCase()) {
    case "FOLLOW":
    case "FOLLOW_REQUEST":
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

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const {
    items,
    unreadCount,
    isLoading,
    error,
    pagination,
    fetchNotifications,
    markRead,
    markAllRead,
    bindSocket,
  } = useNotificationStore();

  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchNotifications({ page: 1, limit: 20 });
    bindSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (loadingMore) return;
    if (pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    try {
      await fetchNotifications({ page: pagination.page + 1, limit: pagination.limit });
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
              {unreadCount} new
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-border">
        {isLoading && items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Loading notifications…</div>
        ) : error ? (
          <div className="p-6 text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <NotificationRow key={n.id} n={n} onSeen={() => markRead(n.id)} />
          ))
        )}
      </Card>

      {pagination.page < pagination.pages && (
        <div className="flex justify-center py-3">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onSeen }) {
  const isFollowReq = String(n.type).toUpperCase() === "FOLLOW_REQUEST" && n.relatedUserId;
  const when = n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "";

  // Prefer username route if backend enriched it; fallback to id; else "#"
  const href = n.relatedPostId
    ? `/post/${n.relatedPostId}`
    : n.relatedUserUsername
    ? `/u/${n.relatedUserUsername}`
    : n.relatedUserId
    ? `/u/${n.relatedUserId}`
    : "#";

  // Visual state: unread = highlighted bg + bold; read = subtle text
  const rowClass = n.read ? "hover:bg-muted/50" : "bg-primary/5 hover:bg-primary/10";
  const titleClass = n.read ? "text-foreground" : "font-medium text-foreground";
  const metaClass = n.read ? "text-muted-foreground" : "text-muted-foreground";

  return (
    <div
      className={`p-4 flex items-center gap-3 transition-colors ${rowClass}`}
      onMouseEnter={onSeen}
    >
      {/* Leading icon + unread dot */}
      <div className="relative shrink-0 rounded-full p-2 bg-secondary text-secondary-foreground">
        {typeIcon(n.type)}
        {!n.read && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${titleClass}`}>{n.message || prettyMessage(n)}</div>
        <div className={`text-xs ${metaClass}`}>{when}</div>
      </div>

      {/* Actions or link */}
      {isFollowReq ? (
        <FollowRequestActions followerId={n.relatedUserId} />
      ) : (
        <Link href={href} className="text-xs underline text-primary">
          View
        </Link>
      )}
    </div>
  );
}

function prettyMessage(n) {
  const t = (n.type || "").toUpperCase();
  if (t === "FOLLOW_REQUEST") return "New follow request";
  if (t === "FOLLOW_ACCEPTED") return "Your follow request was accepted";
  if (t === "FOLLOW") return "Someone started following you";
  if (t === "LIKE") return "Someone liked your post";
  if (t === "COMMENT") return "Someone commented on your post";
  if (t === "REPLY") return "Someone replied to your post";
  if (t === "GROUP_INVITE") return "You were invited to a group";
  return "You have a new notification";
}

/** Inline Accept / Decline for follow requests */
function FollowRequestActions({ followerId }) {
  const accept = useSocialStore((s) => s.acceptFollowRequest);
  const decline = useSocialStore((s) => s.declineFollowRequest);
  const [busy, setBusy] = useState(false);

  const onAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await accept(followerId);
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await decline(followerId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onAccept} disabled={busy} className="gap-1">
        <CheckCircle2 className="w-4 h-4" />
        Accept
      </Button>
      <Button size="sm" variant="secondary" onClick={onDecline} disabled={busy} className="gap-1">
        <XCircle className="w-4 h-4" />
        Decline
      </Button>
    </div>
  );
}
