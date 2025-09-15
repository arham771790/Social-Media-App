'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MobileNavbar from '@/components/layout/MobileNavbar';
import Stories from '@/components/stories/Stories';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const isMessages = pathname?.startsWith('/messages');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* ===== Desktop / Tablet Layout ===== */}
        <div className="hidden md:flex w-full">
          {/* Left Sidebar (fixed) */}
          <div className="fixed left-0 top-0 h-full w-20 lg:w-64 border-r border-gray-800 z-40 transition-all">
            <Sidebar />
          </div>

          {/* Main content area (adds left margin to clear fixed sidebar) */}
          <div className="flex-1 md:ml-20 lg:ml-64">
            <div className="max-w-6xl mx-auto flex">
              {/* Center column */}
              <main className="flex-1 w-full min-h-screen">
                {/* Desktop Stories */}
                {!isMessages && (
                  <div className="sticky top-0 z-30 bg-black border-b border-gray-900/50">
                    <Stories />
                  </div>
                )}

                {/* Page content */}
                <div className="px-3 sm:px-4 md:px-6 py-6">
                  {children}
                </div>
              </main>

              {/* Right Sidebar (xl+) */}
              <aside className="hidden xl:block w-80 px-6 py-6">
                <div className="sticky top-6">
                  <RightSidebar />
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* ===== Mobile Layout ===== */}
        <div className="md:hidden flex flex-col flex-1">
          {/* Global mobile header: hide on /messages so messages page can render its own */}
          {!isMessages && (
            <header className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-gray-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Instagram
                </h1>
                <div className="flex items-center space-x-4" />
              </div>
            </header>
          )}

          {/* Mobile Stories: hidden on /messages */}
          {!isMessages && (
            <div className="sticky top-[56px] z-30 bg-black border-b border-gray-900/50">
              <Stories />
            </div>
          )}

          {/* Main content with conditional bottom padding */}
          <main
            className={cn(
              'flex-1 px-4 py-4',
              !isMessages && 'pb-20 [padding-bottom:env(safe-area-inset-bottom)]'
            )}
          >
            {children}
          </main>

          {/* Mobile Navbar: hidden on /messages */}
          {!isMessages && (
            <div className="fixed bottom-0 left-0 right-0 z-50">
              <MobileNavbar />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
