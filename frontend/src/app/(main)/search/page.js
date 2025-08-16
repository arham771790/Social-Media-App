'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserStore } from '@/store/userStore';
import { useSocialStore } from '@/store/socialStore';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [localQ, setLocalQ] = useState('');           // input value
  const [isTyping, setIsTyping] = useState(false);
  const debounceRef = useRef(null);

  const { searchUsers, searchResults, searchPagination, isLoading, error } = useUserStore();
  const { followUser, unfollowUser, followPending } = useSocialStore();

  // normalize: allow "@user", trim spaces
  const normalized = useMemo(() => (localQ || '').replace(/^@/, '').trim(), [localQ]);

  useEffect(() => {
    // Debounce search 300ms
    setIsTyping(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQuery(normalized);
      setIsTyping(false);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [normalized]);

  useEffect(() => {
    if (query) searchUsers({ q: query, page: 1, limit: 20 }).catch(() => {});
  }, [query, searchUsers]);

  const loadMore = async () => {
    const { page, pages } = searchPagination || {};
    if (!query || isLoading || (pages && page >= pages)) return;
    await searchUsers({ q: query, page: page + 1, limit: 20 });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by username (try @maria, john, ...)"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base"
          />
        </div>
      </Card>

      {error && (
        <Card className="p-4 text-destructive">Search failed. Please try again.</Card>
      )}

      {/* Empty state */}
      {!isLoading && query && searchResults.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground">
          No users found for <span className="text-foreground font-medium">“{query}”</span>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        {searchResults.map((u) => {
          const pending = !!followPending[String(u.id)];
          return (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar} />
                  <AvatarFallback>{u.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium leading-none">{u.username}</div>
                  {u.bio && (
                    <div className="text-xs text-muted-foreground line-clamp-1">{u.bio}</div>
                  )}
                </div>
              </div>

              {u.isFollowing ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => unfollowUser(u.id)}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Following
                </Button>
              ) : (
                <Button size="sm" disabled={pending} onClick={() => followUser(u.id)}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Follow
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Load More */}
      {query && (searchPagination?.page || 0) < (searchPagination?.pages || 0) && (
        <div className="flex justify-center">
          <Button onClick={loadMore} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Load more
          </Button>
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="text-center text-xs text-muted-foreground">typing…</div>
      )}
    </div>
  );
}
