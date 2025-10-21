'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Copy, Check, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();
  const [copiedField, setCopiedField] = useState(null);

  // load token/user on first mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push('/feed');
  }, [isAuthenticated, isLoading, router]);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) return null; // redirecting

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-orange-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Logo and Title */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-blue-500 rounded-2xl shadow-2xl shadow-blue-500/20 mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-orange-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Instopedia
            </h1>
            <p className="text-gray-400 text-xl md:text-2xl font-light">
              Connect, Share, Inspire
            </p>
          </div>

          {/* Test Credentials Card */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Test Account Available
              </h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 group hover:bg-black/50 transition-all">
                <div className="text-left flex-1">
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="text-sm font-mono text-blue-400">test123@gmail.com</div>
                </div>
                <button
                  onClick={() => copyToClipboard('test123@gmail.com', 'email')}
                  className="ml-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between bg-black/30 rounded-lg p-3 group hover:bg-black/50 transition-all">
                <div className="text-left flex-1">
                  <div className="text-xs text-gray-500 mb-1">Password</div>
                  <div className="text-sm font-mono text-blue-400">Password</div>
                </div>
                <button
                  onClick={() => copyToClipboard('Password', 'password')}
                  className="ml-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {copiedField === 'password' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 px-8 py-6 text-lg rounded-xl transition-all hover:scale-105">
              <Link href="/login">Login Now</Link>
            </Button>
            <Button asChild variant="outline" className="border-2 border-gray-600 bg-transparent text-white hover:bg-gray-800 hover:border-gray-500 px-8 py-6 text-lg rounded-xl transition-all hover:scale-105">
              <Link href="/register">Create Account</Link>
            </Button>
          </div>

          {/* Tech Stack */}
          <div className="pt-8 border-t border-gray-800">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Powered By</p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">Next.js</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">Tailwind CSS</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">shadcn/ui</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">Zustand</span>
              <span className="px-3 py-1 bg-gray-800/50 rounded-full">Socket.io</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
