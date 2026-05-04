import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import AuthRedirect from '@/components/home/AuthRedirect';
import CredentialsCard from '@/components/home/CredentialsCard';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 text-white relative overflow-hidden">
      {/* 🚀 Auth Logic handled in isolated Client Component */}
      <AuthRedirect />

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

          {/* 🔑 Interactive Credentials Card */}
          <CredentialsCard />

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
