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
  Settings,
  Filter,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">
                Stay updated with your latest activities
              </p>
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
                onClick={markAllRead} 
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

        {/* Content Section */}
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
                  onClick={() => fetchNotifications({ page: 1, limit: 20 })}
                  className="border-destructive/30 hover:bg-destructive/10"
                >
                  Try again
                </Button>
              </div>
            </Card>
          ) : items.length === 0 ? (
            <Card className="overflow-hidden">
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground">All caught up!</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    You don't have any notifications yet. When you do, they'll appear here.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden shadow-sm border-0 bg-card/50 backdrop-blur-sm">
              <div className="divide-y divide-border/50">
                {items.map((n, index) => (
                  <NotificationRow 
                    key={n.id} 
                    n={n} 
                    onSeen={() => markRead(n.id)}
                    index={index}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Load More Section */}
          {pagination.page < pagination.pages && (
            <div className="flex justify-center py-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMore} 
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationRow({ n, onSeen, index }) {
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

  // Enhanced visual states with better contrast
  const rowClass = n.read 
    ? "hover:bg-muted/30 opacity-75" 
    : "bg-primary/5 hover:bg-primary/10 border-l-2 border-primary/30";
  
  const titleClass = n.read 
    ? "text-muted-foreground" 
    : "font-medium text-foreground";
  
  const metaClass = "text-xs text-muted-foreground/80";

  return (
    <div
      className={`group relative p-4 sm:p-5 flex items-start sm:items-center gap-3 sm:gap-4 transition-all duration-200 ${rowClass}`}
      onMouseEnter={onSeen}
      style={{
  animationName: "fadeInUp",
  animationDuration: "0.4s",
  animationTimingFunction: "ease-out",
  animationFillMode: "forwards",
  animationDelay: `${index * 50}ms`
}}
    >
      {/* Leading icon with enhanced styling */}
      <div className={`relative shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 ${getTypeColor(n.type)} group-hover:scale-105`}>
        {typeIcon(n.type)}
        {!n.read && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-background animate-pulse" />
        )}
      </div>

      {/* Main content with better responsive layout */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className={`text-sm sm:text-base leading-relaxed ${titleClass}`}>
          {n.message || prettyMessage(n)}
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

      {/* Actions section with better mobile layout */}
      <div className="shrink-0 flex items-center">
        {isFollowReq ? (
          <FollowRequestActions followerId={n.relatedUserId} />
        ) : (
          <Link 
            href={href} 
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}

function prettyMessage(n) {
  const t = (n.type || "").toUpperCase();
  if (t === "FOLLOW_REQUEST") return "sent you a follow request";
  if (t === "FOLLOW_ACCEPTED") return "accepted your follow request";
  if (t === "FOLLOW") return "started following you";
  if (t === "LIKE") return "liked your post";
  if (t === "COMMENT") return "commented on your post";
  if (t === "REPLY") return "replied to your comment";
  if (t === "GROUP_INVITE") return "invited you to join a group";
  return "You have a new notification";
}

/** Enhanced Follow Request Actions with better mobile UX */
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
      setResult('accepted');
    } catch (error) {
      console.error('Failed to accept follow request:', error);
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (busy || result) return;
    setBusy(true);
    try {
      await decline(followerId);
      setResult('declined');
    } catch (error) {
      console.error('Failed to decline follow request:', error);
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {result === 'accepted' ? (
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

// Add CSS for animations
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}