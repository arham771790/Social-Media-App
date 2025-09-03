'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, MessageCircle, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/store/authStore'

const navigationItems = [
  { name: 'Home', href: '/feed', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Create', href: '/create', icon: PlusSquare },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Notifications', href: '/notifications', icon: Heart },
]

export default function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-black border-t border-gray-800 z-50">
      <div className="flex items-center justify-around py-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
                isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
            </Link>
          )
        })}

        {/* Profile */}
        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center py-2 px-3 rounded-lg transition-colors",
            pathname.startsWith('/profile') ? "text-white" : "text-gray-400 hover:text-gray-200"
          )}
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src={user?.profilePicture} alt={user?.username} />
            <AvatarFallback className="bg-gray-600 text-white text-xs">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center py-2 px-3 text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </nav>
  )
}
