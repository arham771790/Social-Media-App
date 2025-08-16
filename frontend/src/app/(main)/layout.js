'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MobileNavbar from '@/components/layout/MobileNavbar';
import CreatePost from '@/components/feed/CreatePost';

export default function MainLayout({ children }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white">
        {/* Desktop */}
        <div className="hidden md:flex">
          {/* Left Sidebar */}
          <div className="fixed left-0 top-0 h-full w-64 border-r border-gray-800 z-40">
            <Sidebar />
          </div>

          {/* Main content */}
          <div className="flex-1 ml-64">
            <div className="max-w-6xl mx-auto flex">
              {/* Center */}
              <main className="flex-1 max-w-2xl mx-auto px-4 py-6">
                {/* Create Post shows once (desktop) */}
                <div className="mb-6">
                  <CreatePost />
                </div>

                {children}
              </main>

              {/* Right Sidebar */}
              <aside className="hidden xl:block w-80 px-6 py-6">
                <div className="sticky top-6">
                  <RightSidebar />
                </div>
              </aside>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </h1>
              <div className="flex items-center space-x-4" />
            </div>
          </header>

          <main className="px-4 py-4 pb-20">
            {/* Create Post shows once (mobile) */}
            <div className="mb-6">
              <CreatePost />
            </div>

            {children}
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-50">
            <MobileNavbar />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
