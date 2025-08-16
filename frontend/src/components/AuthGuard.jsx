'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {useAuthStore} from '@/store/authStore'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * AuthGuard component to protect routes that require authentication
 * Wraps pages that need user to be logged in
 */
export default function AuthGuard({ children }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    // Check authentication status on mount
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading skeleton while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="grid grid-cols-4 gap-6 p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full bg-gray-800" />
            <Skeleton className="h-8 w-3/4 bg-gray-800" />
            <Skeleton className="h-8 w-1/2 bg-gray-800" />
          </div>
          <div className="col-span-2 space-y-6">
            <Skeleton className="h-96 w-full bg-gray-800" />
            <Skeleton className="h-64 w-full bg-gray-800" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-gray-800" />
            <Skeleton className="h-8 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    )
  }

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return children
}