'use client';

import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/layout/Sidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MobileNavbar from '@/components/layout/MobileNavbar';
import Stories from '@/components/stories/Stories';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const isMessages = pathname?.startsWith('/messages');
  const safeUserInitial = user?.username?.[0]?.toUpperCase() || 'I';

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged out', description: 'You have been signed out.' });
    router.push('/login');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.03] to-transparent" />

        <div className="hidden md:block">
          <div
            className={cn(
              'mx-auto flex w-full max-w-[1560px] gap-5 px-4 py-4 lg:px-6 xl:px-8',
              isMessages && 'max-w-[1620px]'
            )}
          >
            <aside className="w-[18.5rem] shrink-0">
              <div className="sticky top-4 h-[calc(100vh-2rem)]">
                <Sidebar />
              </div>
            </aside>

            <div className="min-w-0 flex-1">
              {!isMessages && (
                <div className="sticky top-4 z-20 mb-5">
                  <div className="surface-panel overflow-hidden rounded-[2rem] px-4 py-4">
                    <Stories />
                  </div>
                </div>
              )}

              <main className="min-w-0">
                {children}
              </main>
            </div>

            {!isMessages && (
              <aside className="hidden xl:block w-[22rem] shrink-0">
                <div className="sticky top-4">
                  <RightSidebar />
                </div>
              </aside>
            )}
          </div>
        </div>

        <div className="md:hidden flex min-h-screen flex-col pb-28 [padding-bottom:calc(5.75rem+env(safe-area-inset-bottom))]">
          {!isMessages && (
            <>
              <header className="sticky top-0 z-50 px-3 pt-3">
                <div className="surface-panel flex items-center justify-between rounded-[1.75rem] px-4 py-3">
                  <Link href="/feed" className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(214,173,118,0.98),rgba(102,126,109,0.9))] shadow-[0_14px_28px_-18px_rgba(214,173,118,0.8)]">
                      <span className="font-display text-xl text-primary-foreground">I</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-[1.9rem] leading-none tracking-[-0.05em] text-foreground">
                        Instopedia
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
                        Social notebook
                      </p>
                    </div>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-11 rounded-full border border-white/8 bg-background/25">
                        <Avatar className="size-8">
                          <AvatarImage src={user?.profilePicture || user?.avatar || undefined} alt={user?.username || 'user'} />
                          <AvatarFallback>{safeUserInitial}</AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => router.push('/profile')}>
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              <div className="px-3 pt-3">
                <div className="surface-panel overflow-hidden rounded-[1.75rem] px-3 py-3">
                  <Stories />
                </div>
              </div>
            </>
          )}

          <main
            className={cn(
              'flex-1 px-3 py-4',
              isMessages && 'px-0 py-0'
            )}
          >
            {children}
          </main>

          {!isMessages && (
            <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
              <MobileNavbar />
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
