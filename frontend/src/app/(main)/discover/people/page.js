'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialStore } from '@/store/socialStore';

const PAGE_SIZE = 24;

export default function PeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageParam = Number(searchParams.get('page') || '1');
  const qParam = (searchParams.get('q') || '').trim();

  const {
    discoverPaged,
    fetchSuggestionsPaged,
    clearSuggestionsPaged,
    followUser,
    unfollowUser,
  } = useSocialStore();

  const { items, isLoading, error, page, hasMore, q } = discoverPaged;

  // Fetch whenever page or q changes
  useEffect(() => {
    fetchSuggestionsPaged({ page: pageParam, limit: PAGE_SIZE, q: qParam }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, qParam]);

  const onSearch = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nextQ = (form.get('q') || '').toString().trim();

    // reset state for a fresh query
    clearSuggestionsPaged();

    const sp = new URLSearchParams(searchParams.toString());
    if (nextQ) sp.set('q', nextQ);
    else sp.delete('q');
    sp.set('page', '1');
    router.push(`/discover/people?${sp.toString()}`);
  };

  const onClearSearch = () => {
    clearSuggestionsPaged();
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('q');
    sp.set('page', '1');
    router.push(`/discover/people?${sp.toString()}`);
  };

  const gotoPage = (p) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(p));
    router.push(`/discover/people?${sp.toString()}`);
  };

  const Title = useMemo(
    () => (qParam ? `People matching "${qParam}"` : 'People you may like'),
    [qParam]
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-semibold">{Title}</h1>
        <form onSubmit={onSearch} className="flex items-center gap-2">
          <Input
            name="q"
            placeholder="Search people"
            defaultValue={qParam}
            className="w-56 bg-gray-900 border-gray-800 text-white placeholder-gray-500"
          />
          <Button type="submit">Search</Button>
          {qParam ? (
            <Button type="button" variant="outline" onClick={onClearSearch}>
              Clear
            </Button>
          ) : null}
        </form>
      </div>

      {/* Grid */}
      {isLoading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-3 w-16 bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((u) => (
              <Card key={u.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={u.profilePicture || u.avatar || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {(u.username || '?')[0]?.toUpperCase?.() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${encodeURIComponent(u.username)}`}
                        className="font-medium hover:underline truncate block"
                        title={u.username}
                      >
                        {u.username}
                      </Link>
                      <p className="text-xs text-gray-400 truncate">
                        {Number(u.followersCount || 0).toLocaleString()} followers
                        {u.mutualsCount ? ` · ${u.mutualsCount} mutual` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {u.isFollowing ? (
                      <Button
                        variant="outline"
                        className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                        onClick={async () => {
                          await unfollowUser(u.id).catch(() => {});
                        }}
                      >
                        Following
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={async () => {
                          await followUser(u.id).catch(() => {});
                        }}
                      >
                        Follow
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              variant="outline"
              disabled={pageParam <= 1 || isLoading}
              onClick={() => gotoPage(pageParam - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-400">
              Page {pageParam}
              {discoverPaged.total ? ` · ${discoverPaged.total} total` : ''}
            </span>
            <Button
              variant="outline"
              disabled={!hasMore || isLoading}
              onClick={() => gotoPage(pageParam + 1)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-gray-400">
          {qParam ? 'No people matched your search.' : 'No suggestions yet.'}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
