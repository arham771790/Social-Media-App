"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  PlusSquare,
  Search,
  Settings,
  Sparkles,
  User,
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
  { name: "Home", href: "/feed", icon: Home, description: "Latest notes" },
  { name: "Search", href: "/search", icon: Search, description: "Find people" },
  { name: "Messages", href: "/messages", icon: MessageCircle, description: "Private room" },
  { name: "Notifications", href: "/notifications", icon: Heart, description: "Signals" },
  { name: "Explore", href: "/explore", icon: Compass, description: "Fresh corners" },
  { name: "Create", href: "/create", icon: PlusSquare, description: "Publish" },
  { name: "Profile", href: "/profile", icon: User, description: "Your page" },
];

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
  const { unreadCount } = useNotifications(20);
  const safeUserInitial = user?.username?.[0]?.toUpperCase() || "I";
  const msgUnread = 0;

  const handleLogout = async () => {
    await logout();
    toast({ title: "Logged out", description: "You have been signed out." });
    router.push("/login");
  };

  return (
    <div className="surface-panel flex h-full flex-col rounded-[2rem] p-4">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <Link href="/feed" className="group flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[1.35rem] border border-white/10 bg-[linear-gradient(135deg,rgba(214,173,118,0.98),rgba(102,126,109,0.9))] shadow-[0_18px_34px_-20px_rgba(214,173,118,0.76)]">
              <span className="font-display text-[1.45rem] text-primary-foreground">I</span>
            </div>
            <div className="min-w-0">
              <p className="font-display text-[2rem] leading-none tracking-[-0.05em] text-foreground">
                Instopedia
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Social notebook
              </p>
            </div>
          </Link>

          <Button asChild size="sm" className="rounded-full">
            <Link href="/create">
              <PlusSquare className="h-4 w-4" />
              Create
            </Link>
          </Button>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-white/7 bg-background/28 p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Daily rhythm
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/88">
            Move between feed, people, and conversations without visual noise.
          </p>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1.5">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            const badgeValue =
              item.name === "Notifications"
                ? unreadCount
                : item.name === "Messages"
                  ? msgUnread
                  : 0;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-[1.35rem] border px-3.5 py-3 transition-all duration-200",
                    active
                      ? "border-primary/20 bg-primary/10 text-foreground shadow-[0_18px_40px_-34px_rgba(214,173,118,0.72)]"
                      : "border-transparent text-muted-foreground hover:border-white/7 hover:bg-white/[0.04] hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex size-10 shrink-0 items-center justify-center rounded-[1rem] border transition-all duration-200",
                      active
                        ? "border-primary/22 bg-primary/12 text-primary"
                        : "border-white/7 bg-background/30 text-muted-foreground group-hover:border-primary/16 group-hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {badgeValue > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-[1.2rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-5 text-primary-foreground shadow-[0_12px_20px_-12px_rgba(214,173,118,0.9)]">
                        {badgeValue > 99 ? "99+" : badgeValue}
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium tracking-[-0.01em]">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 rounded-[1.5rem] border border-white/7 bg-background/24 p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto w-full justify-start rounded-[1.2rem] p-2.5 hover:bg-white/[0.04]"
            >
              <Avatar className="size-11">
                <AvatarImage src={user?.avatar || user?.profilePicture || undefined} alt={user?.username || "user"} />
                <AvatarFallback>{safeUserInitial}</AvatarFallback>
              </Avatar>

              <div className="ml-3 flex-1 text-left">
                <p className="text-sm font-medium text-foreground">@{user?.username || "instopedia"}</p>
                <p className="text-xs text-muted-foreground">Signed in</p>
              </div>

              <span className="flex size-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.7)]" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              View profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
