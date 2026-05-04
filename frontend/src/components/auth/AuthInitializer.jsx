'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSocialStore } from '@/store/socialStore';
import { usePathname, useRouter } from 'next/navigation';

/**
 * AuthInitializer
 * - Syncs localStorage token with Cookies for Middleware compatibility.
 * - Handles the edge case where a user visits /login with a token in localStorage but no cookie.
 */
export default function AuthInitializer() {
  const { hydrate, isAuthenticated, isLoading, user } = useAuthStore();
  const { getFollowing, followingByUser } = useSocialStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Fetch following list once authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const myKey = String(user.id);
      if (!followingByUser[myKey]?.items && !followingByUser[myKey]?.isLoading) {
        getFollowing(user.id, { page: 1, limit: 100 }).catch(() => {});
      }
    }
  }, [isAuthenticated, user?.id, getFollowing, followingByUser]);

  useEffect(() => {
    // If we have a token (authenticated) but we are on an auth page, 
    // it means Middleware didn't see the cookie yet.
    // We should redirect to /feed.
    const authPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
    const isAuthPath = authPaths.includes(pathname);

    if (!isLoading && isAuthenticated && isAuthPath) {
      router.replace('/feed');
    }
    
    // Conversely, if we are NOT authenticated but on a protected path,
    // Middleware should have caught this, but if it didn't (rare), 
    // we should redirect to /login.
    const protectedPaths = ['/feed', '/messages', '/notifications', '/profile', '/settings', '/u', '/users'];
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

    if (!isLoading && !isAuthenticated && isProtectedPath) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  return null;
}
