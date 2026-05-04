"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Heart,
  Home,
  MessageCircle,
  PlusSquare,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { useNotifications } from "@/hooks/useNotifications";

const navigationItems = [
  { name: "Home", href: "/feed", icon: Home, aria: "Go to home" },
  { name: "Search", href: "/search", icon: Search, aria: "Search" },
  { name: "Create", href: "/create", icon: PlusSquare, aria: "Create post" },
  { name: "Messages", href: "/messages", icon: MessageCircle, aria: "Messages" },
  { name: "Notifications", href: "/notifications", icon: Heart, aria: "Notifications" },
];

const isActivePath = (pathname, href) => {
  if (!pathname || !href) return false;
  if (href === "/profile") return pathname.startsWith("/profile");
  return pathname === href;
};

export default function MobileNavbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount: notifUnread } = useNotifications(20);
  const msgUnread = 0;
  const safeUserInitial = user?.username?.[0]?.toUpperCase() || "I";

  return (
    <nav
      className="surface-panel mx-auto flex w-full max-w-md items-center justify-between rounded-[1.9rem] px-2.5 py-2"
      role="navigation"
      aria-label="Mobile primary"
    >
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        const badgeValue =
          item.name === "Notifications"
            ? notifUnread
            : item.name === "Messages"
              ? msgUnread
              : 0;

        return (
          <Link
            key={item.name}
            href={item.href}
            aria-label={item.aria}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-[1.1rem] transition-all duration-200",
              active
                ? "bg-primary/12 text-primary shadow-[0_18px_32px_-26px_rgba(214,173,118,0.8)]"
                : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {badgeValue > 0 && (
              <span className="absolute right-1.5 top-1.5 min-w-[1.1rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground shadow-[0_10px_20px_-10px_rgba(214,173,118,0.92)]">
                {badgeValue > 99 ? "99+" : badgeValue}
              </span>
            )}
          </Link>
        );
      })}

      <Link
        href="/profile"
        aria-label="Profile"
        aria-current={pathname?.startsWith("/profile") ? "page" : undefined}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-[1.1rem] transition-all duration-200",
          pathname?.startsWith("/profile")
            ? "bg-primary/12 text-primary shadow-[0_18px_32px_-26px_rgba(214,173,118,0.8)]"
            : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
        )}
      >
        <Avatar className="size-7">
          <AvatarImage src={user?.profilePicture || user?.avatar || undefined} alt={user?.username || "user"} />
          <AvatarFallback className="text-[10px]">
            {safeUserInitial}
          </AvatarFallback>
        </Avatar>
        {pathname?.startsWith("/profile") && (
          <User className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-card p-[2px] text-primary" />
        )}
      </Link>
    </nav>
  );
}
