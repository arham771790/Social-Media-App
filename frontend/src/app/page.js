'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  // load token/user on first mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/feed');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) return null; // will redirect

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-blue-400 bg-clip-text text-transparent">
          Instopedia...
        </h1>
        <p className="text-gray-400 text-lg">Welcome to your next social app</p>
        <div className="space-x-4">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
        <div className="text-2xl text-gray-500 mt-8">
          Next.js • Tailwind • shadcn/ui • Zustand • Socket.io
        </div>
      </div>
    </div>
  );
}
