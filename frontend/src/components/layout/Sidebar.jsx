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
    <div className="flex flex-col h-full bg-black border-r border-gray-800">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <Link href="/feed" className="flex items-center space-x-2">
            {!isCollapsed ? (
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </h1>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">I</span>
              </div>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
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
                    'flex items-center px-3 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors',
                    isActive && 'text-white bg-gray-800'
                  )}
                >
                  {/* Icon + badge wrapper */}
                  <span className="relative inline-flex">
                    <Icon className="w-6 h-6 flex-shrink-0" />
                    {/* 🔴 Unread badge only on Notifications */}
                    {item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[10px] leading-[18px] text-white font-semibold text-center">
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
      <div className="p-3 border-t border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 p-3"
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={user?.profilePicture} alt={user?.username} />
                <AvatarFallback className="bg-gray-700 text-white text-sm">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="ml-3 flex-1 text-left">
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-gray-500">@{user?.username}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-700">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center cursor-pointer text-white hover:bg-gray-800">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center cursor-pointer text-white hover:bg-gray-800">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center cursor-pointer text-red-400 hover:bg-red-900/20 focus:bg-red-900/20"
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
