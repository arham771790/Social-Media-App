'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MobileNavbar from '@/components/layout/MobileNavbar';


export default function MainLayout({ children }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* ===== Desktop / Tablet Layout ===== */}
        <div className="hidden md:flex w-full">
          {/* Left Sidebar */}
          <div className="fixed left-0 top-0 h-full w-20 lg:w-64 border-r border-gray-800 z-40 transition-all">
            {/* Collapse Sidebar on tablet, full on lg+ */}
            <Sidebar />
          </div>

          {/* Main content */}
          <div className="flex-1 md:ml-20 lg:ml-64">
            <div className="max-w-6xl mx-auto flex">
              {/* Center */}
              <main className="flex-1 w-full px-3 sm:px-4 md:px-6 py-6">
                {/* CreatePost only once on desktop */}
              
                {children}
              </main>

              {/* Right Sidebar (only xl and up) */}
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
          <header className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </h1>
              <div className="flex items-center space-x-4" />
            </div>
          </header>

          <main className="flex-1 px-4 py-4 pb-20">
            {/* CreatePost only once on mobile */}
            
            {children}
          </main>

          {/* Mobile Navbar */}
          <div className="fixed bottom-0 left-0 right-0 z-50">
            <MobileNavbar />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
