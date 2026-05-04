'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function AuthRedirect() {
    const router = useRouter();
    const { isAuthenticated, isLoading, hydrate } = useAuthStore();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    // Middleware handles the redirect to /feed if authenticated

    if (isLoading) {
        return (
            <div className="fixed inset-0 min-h-screen bg-black text-white flex items-center justify-center z-50">
                <div className="text-lg animate-pulse">Initializing...</div>
            </div>
        );
    }

    return null;
}
