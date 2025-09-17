'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Lock,
  X,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserStore } from '@/store/userStore';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [localQ, setLocalQ] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const debounceRef = useRef(null);

  const { searchUsers, searchResults, searchPagination, isLoading, error } =
    useUserStore();

  const normalized = useMemo(
    () => (localQ || '').replace(/^@/, '').trim(),
    [localQ]
  );

  // debounce input
  useEffect(() => {
    setIsTyping(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(normalized);
      setIsTyping(false);
    }, 300);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [normalized]);

  // fetch page 1
  useEffect(() => {
    if (query) searchUsers({ q: query, page: 1, limit: 20 }).catch(() => {});
  }, [query, searchUsers]);

  const loadMore = async () => {
    const { page = 1, pages = 1 } = searchPagination || {};
    if (!query || isLoading || page >= pages) return;
    await searchUsers({ q: query, page: page + 1, limit: 20 });
  };

  const clearInput = () => {
    setLocalQ('');
    setQuery('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-3 sm:px-0">
      {/* Search bar */}
      <Card className="p-0 rounded-full shadow-sm border bg-background">
        <div className="flex items-center gap-2 px-4">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="border-0 focus-visible:ring-0 text-sm py-2 bg-transparent"
            autoFocus
          />
          {localQ && (
            <button
              aria-label="Clear"
              onClick={clearInput}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {isTyping && (
          <div className="pb-2 text-center text-xs text-muted-foreground">
            typing…
          </div>
        )}
      </Card>

      {/* Error */}
      {error && (
        <Card className="flex items-center justify-center p-4 text-destructive text-sm">
          Search failed. Please try again.
        </Card>
      )}

      {/* Empty */}
      {!isLoading && query && searchResults.length === 0 && !error && (
        <Card className="p-12 text-center text-muted-foreground">
          <SearchIcon className="mx-auto h-8 w-8 opacity-40 mb-3" />
          <div className="text-sm">
            No users found for <b>{query}</b>
          </div>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && searchResults.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 border-b"
            >
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      <div className="divide-y rounded-md border">
        {searchResults.map((u) => {
          const initial = (u.username?.[0] || u.name?.[0] || 'U').toUpperCase();
          return (
            <Link key={u.id} href={`/u/${u.username}`} className="block group">
              <div className="flex items-center justify-between px-3 py-2 hover:bg-accent/40 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-11 w-11 ring-0">
                    <AvatarImage src={u.avatar || undefined} />
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-semibold">
                        {u.username}
                      </span>
                      {u.isPrivate && (
                        <span className="flex items-center text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          <Lock className="mr-1 h-3 w-3" />
                          Private
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {u.name || '—'}
                    </div>
                    {u.bio && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {u.bio}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right arrow CTA */}
                <div className="opacity-0 group-hover:opacity-100 transition">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5 text-muted-foreground"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load more */}
      {query &&
        (searchPagination?.page || 0) < (searchPagination?.pages || 0) && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
    </div>
  );
}
