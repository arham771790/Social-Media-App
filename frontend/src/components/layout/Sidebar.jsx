"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Search,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Settings,
  LogOut,
  Menu,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

const navigationItems = [
  { name: "Home", href: "/feed", icon: Home },
  { name: "Search", href: "/search", icon: Search },
  { name: "Messages", href: "/messages", icon: MessageCircle },
  { name: "Notifications", href: "/notifications", icon: Heart },
  { name: "Explore", href: "/explore", icon: Compass },
  { name: "Create", href: "/create", icon: PlusSquare },
  { name: "Profile", href: "/profile", icon: User },
];

const COLLAPSE_KEY = "sidebarCollapsed:v1";

const isActivePath = (pathname, href) => {
  if (!pathname || !href) return false;
  if (href === "/profile") return pathname.startsWith("/profile");
  return pathname === href;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  // ✅ separate selectors to avoid new object snapshots
  const { unreadCount } = useNotifications(20);
  const msgUnread = 0; // Placeholder for messageStore unread if needed separately

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(COLLAPSE_KEY);
      if (saved != null) setIsCollapsed(saved === "1");
    } catch { }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(COLLAPSE_KEY, isCollapsed ? "1" : "0");
    } catch { }
  }, [isCollapsed, mounted]);

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    router.push("/login");
  };

  const safeUserInitial = useMemo(
    () => (user?.username ? user.username[0].toUpperCase() : "U"),
    [user?.username]
  );

  if (!mounted) return null;

  return (
    <div className="hidden lg:flex flex-col h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/feed" className="flex items-center space-x-2 group">
            {!isCollapsed ? (
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-blue-300 transition-all duration-300">
                Instopedia
              </h1>
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                <span className="text-white font-bold text-sm">I</span>
              </div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed((v) => !v)}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            const showNotif = item.name === "Notifications" && unreadCount > 0;
            const showMsg = item.name === "Messages" && msgUnread > 0;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group",
                    active &&
                    "text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                  )}
                >
                  <span className="relative inline-flex">
                    <Icon
                      className={cn(
                        "w-6 h-6 flex-shrink-0 transition-all duration-200",
                        active ? "text-purple-400" : "group-hover:text-purple-300"
                      )}
                    />
                    {(showNotif || showMsg) && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] leading-[18px] text-white font-semibold text-center shadow-lg">
                        {(showNotif ? unreadCount : msgUnread) > 99
                          ? "99+"
                          : (showNotif ? unreadCount : msgUnread)}
                      </span>
                    )}
                  </span>

                  {!isCollapsed && (
                    <span className="ml-3 text-base font-medium">{item.name}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Menu */}
      <div className="p-3 border-t border-gray-800/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800/50 p-3 rounded-xl transition-all duration-200"
            >
              <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-purple-500/20">
                <AvatarImage src={user?.avatar} alt={user?.username} />
                <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold">
                  {safeUserInitial}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-400">@{user?.username}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-gray-900/95 border-gray-700/50 backdrop-blur-sm"
          >
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="flex items-center cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700/50" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center cursor-pointer text-red-400 hover:bg-red-900/20 focus:bg-red-900/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
