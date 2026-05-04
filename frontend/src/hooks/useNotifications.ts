'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useEffect } from 'react';
import { socketManager } from '@/lib/socketManager';
import { useAuthStore } from '@/store/authStore';

export interface Notification {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    read: boolean;
    relatedUserId?: string;
    relatedPostId?: string;
    relatedUserUsername?: string;
    relatedUserAvatar?: string;
}

export interface NotificationPage {
    items: Notification[];
    unreadCount: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotifications(limit = 20) {
    const queryClient = useQueryClient();
    const token = useAuthStore((state) => state.token);

    // 1. Fetching Notifications with Infinite Query
    const query = useInfiniteQuery<NotificationPage>({
        queryKey: NOTIFICATIONS_QUERY_KEY,
        queryFn: async ({ pageParam = 1 }) => {
            const { data } = await api.get('/notifications', {
                params: { page: pageParam, limit }
            });
            // Handle both array and object responses
            const items = Array.isArray(data) ? data : (data.notifications || []);
            const unreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : items.filter((n: any) => !n.read).length;
            const pagination = data.pagination || { page: pageParam as number, limit, total: items.length, pages: 1 };

            return { items, unreadCount, pagination };
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.page < lastPage.pagination.pages) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
        staleTime: 30000,
    });

    // 2. Mark as Read Mutation
    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/notifications/${id}/read`);
        },
        onSuccess: (_, id) => {
            // Optimistically update read status in cache
            queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: NotificationPage) => ({
                        ...page,
                        items: page.items.map((n) => n.id === id ? { ...n, read: true } : n),
                        unreadCount: Math.max(0, page.unreadCount - (page.items.some(n => n.id === id && !n.read) ? 1 : 0))
                    }))
                };
            });
        },
    });

    // 3. Mark All Read Mutation
    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            await api.post('/notifications/mark-all-read').catch(() => api.post('/notifications/read-all'));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        },
    });

    // 4. Socket.IO Integration
    useEffect(() => {
        if (!token) return;

        const socket = socketManager.connect(token);
        if (!socket) return;

        const handleNewNotification = (notif: Notification) => {
            queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (old: any) => {
                if (!old) return old;
                // Prepend to the items array in the first page
                const newPages = [...old.pages];
                if (newPages.length > 0) {
                    newPages[0] = {
                        ...newPages[0],
                        items: [notif, ...newPages[0].items],
                        unreadCount: newPages[0].unreadCount + 1,
                    };
                }
                return { ...old, pages: newPages };
            });
        };

        const handleUnreadUpdate = ({ unread }: { unread: number }) => {
            queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((p: NotificationPage) => ({ ...p, unreadCount: unread }))
                };
            });
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('notifications:unread', handleUnreadUpdate);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('notifications:unread', handleUnreadUpdate);
        };
    }, [token, queryClient]);

    // Flattened data helper for UI
    const notifications = query.data?.pages.flatMap(page => page.items) || [];
    const unreadCount = query.data?.pages[0]?.unreadCount || 0;

    return {
        ...query,
        notifications,
        unreadCount,
        markRead: markReadMutation.mutate,
        markAllRead: markAllReadMutation.mutate,
    };
}
