'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate(); // load token/user from localStorage on mount
  }, [hydrate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/feed');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
