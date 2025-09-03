'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore } from '@/store/notificationStore';

const navigationItems = [
  { name: 'Home', href: '/feed', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Notifications', href: '/notifications', icon: Heart },
  { name: 'Explore', href: '/explore', icon: Compass },
  { name: 'Create', href: '/create', icon: PlusSquare },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  // 🔔 notifications store
  const { unreadCount, fetchNotifications, bindSocket } = useNotificationStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // initial pull + live updates
    fetchNotifications({ page: 1, limit: 20 }).catch(() => {});
    bindSocket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged out', description: 'You have been successfully logged out.' });
    router.push('/login');
  };

  return (
     <div className="hidden lg:flex flex-col h-full w-64 bg-gradient-to-b from-gray-900 to-black border-r border-gray-800/50 backdrop-blur-sm">
    {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/feed" className="flex items-center space-x-2 group">
            {!isCollapsed ? (
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:via-pink-300 group-hover:to-blue-300 transition-all duration-300">
                Instagram
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
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/profile' && pathname.startsWith('/profile'));

            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200 group',
                    isActive && 'text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                  )}
                >
                  {/* Icon + badge wrapper */}
                  <span className="relative inline-flex">
                    <Icon className={cn(
                      "w-6 h-6 flex-shrink-0 transition-all duration-200",
                      isActive ? "text-purple-400" : "group-hover:text-purple-300"
                    )} />
                    {/* 🔴 Unread badge only on Notifications */}
                    {item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[10px] leading-[18px] text-white font-semibold text-center shadow-lg animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
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
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
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
          <DropdownMenuContent align="start" className="w-56 bg-gray-900/95 border-gray-700/50 backdrop-blur-sm">
            
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
