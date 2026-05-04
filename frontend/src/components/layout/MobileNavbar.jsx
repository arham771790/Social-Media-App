"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  PlusSquare,
  Heart,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";

// helper: nested path check
const isActivePath = (pathname, href) => {
  if (!pathname || !href) return false;
  if (href === "/profile") return pathname.startsWith("/profile");
  return pathname === href;
};

const navigationItems = [
  { name: "Home", href: "/feed", icon: Home, aria: "Go to home" },
  { name: "Search", href: "/search", icon: Search, aria: "Search" },
  { name: "Create", href: "/create", icon: PlusSquare, aria: "Create post" },
  { name: "Messages", href: "/messages", icon: MessageCircle, aria: "Messages" },
  { name: "Notifications", href: "/notifications", icon: Heart, aria: "Notifications" },
];

export default function MobileNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // ✅ use separate selectors to avoid new object snapshots
  const { unreadCount: notifUnread } = useNotifications(20);
  const msgUnread = 0; // Placeholder for messageStore unread if needed separately

  // mount-safe (avoid hydration mismatch)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const safeUserInitial = useMemo(
    () => (user?.username ? user.username[0].toUpperCase() : "U"),
    [user?.username]
  );

  if (!mounted) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-gray-800/80 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/75 [padding-bottom:env(safe-area-inset-bottom)]"
      role="navigation"
      aria-label="Mobile primary"
    >
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          // badges (messages / notifications)
          const showNotifBadge = item.name === "Notifications" && notifUnread > 0;
          const showMsgBadge = item.name === "Messages" && msgUnread > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.aria}
              className={cn(
                "relative flex flex-col items-center py-2 px-3 rounded-lg transition-colors select-none",
                active ? "text-white" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <span className="relative inline-flex">
                <Icon className={cn("w-6 h-6", active && "fill-current")} />
                {(showNotifBadge || showMsgBadge) && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] leading-[18px] text-white font-semibold text-center shadow-md">
                    {(showNotifBadge ? notifUnread : msgUnread) > 99
                      ? "99+"
                      : (showNotifBadge ? notifUnread : msgUnread)}
                  </span>
                )}
              </span>
            </Link>
          );
        })}

        {/* Profile */}
        <Link
          href="/profile"
          aria-label="Profile"
          className={cn(
            "flex flex-col items-center py-2 px-3 rounded-lg transition-colors select-none",
            pathname?.startsWith("/profile")
              ? "text-white"
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Avatar className="w-6 h-6 ring-1 ring-gray-700/60">
            <AvatarImage src={user?.profilePicture || user?.avatar || undefined} alt={user?.username || "user"} />
            <AvatarFallback className="bg-gray-600 text-white text-[10px]">
              {safeUserInitial}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="flex flex-col items-center py-2 px-3 text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
