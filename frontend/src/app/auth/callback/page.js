'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

function CallbackHandler() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    useEffect(() => {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                
                // Save to localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                
                // Sync cookie for Middleware
                document.cookie = `token=${token}; path=/; max-age=604800; samesite=lax`;
                // In our authStore, we can just call hydrate() if it's exported or just set state
                // Since hydrate() is in the store, we can use it.
                // However, hydrate() only reads from localStorage, so we should call it.
                
                // We'll use the store's set method indirectly by just reloading or calling a dedicated action
                // For now, let's just use window.location.href to ensure a clean state
                window.location.href = '/feed';
                
            } catch (err) {
                console.error('Failed to parse OAuth user:', err);
                toast({
                    title: 'Authentication Error',
                    description: 'Failed to complete social login. Please try again.',
                    variant: 'destructive'
                });
                router.push('/login');
            }
        } else {
            // If no token/user, redirect back to login
            router.push('/login');
        }
    }, [searchParams, router, toast]);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-medium animate-pulse">Completing secure login...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <p>Loading...</p>
            </div>
        }>
            <CallbackHandler />
        </Suspense>
    );
}
