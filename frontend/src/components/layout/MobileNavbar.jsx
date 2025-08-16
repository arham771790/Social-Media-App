'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {useAuthStore} from '@/store/authStore'

const navigationItems = [
  {
    name: 'Home',
    href: '/feed',
    icon: Home,
  },
  {
    name: 'Search',
    href: '/search', 
    icon: Search,
  },
  {
    name: 'Create',
    href: '/create',
    icon: PlusSquare,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Heart,
  },
]

export default function MobileNavbar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <nav className="bg-black border-t border-gray-800">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
                isActive 
                  ? "text-white" 
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              <item.icon 
                className={cn(
                  "w-6 h-6",
                  isActive && "fill-current"
                )} 
              />
            </Link>
          )
        })}
        
        {/* Profile Link */}
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
            (pathname === '/profile' || pathname.startsWith('/profile/'))
              ? "text-white" 
              : "text-gray-400 hover:text-gray-200"
          )}
        >
          <div className="relative">
            <Avatar className="w-6 h-6">
              <AvatarImage src={user?.profilePicture} alt={user?.username} />
              <AvatarFallback className="bg-gray-600 text-white text-xs">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {(pathname === '/profile' || pathname.startsWith('/profile/')) && (
              <div className="absolute -inset-1 border-2 border-white rounded-full"></div>
            )}
          </div>
        </Link>
      </div>
    </nav>
  )
}