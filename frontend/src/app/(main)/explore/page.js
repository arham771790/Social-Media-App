'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocialStore } from '@/store/socialStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const PAGE_SIZE = 24;

export default function ExplorePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const page  = parseInt(sp.get('page') || '1', 10);
  const sort  = (sp.get('sort') || 'trending').toLowerCase();
  const q     = (sp.get('q') || '').trim();
  const tag   = (sp.get('tag') || '').trim();

  const { explore, fetchExplore, fetchTopTags } = useSocialStore();
  const { items, loading, error, tagsTop } = explore;

  const [qLocal, setQLocal] = useState(q);

  useEffect(() => {
    fetchExplore({ page, limit: PAGE_SIZE, sort, q, tag }).catch(() => {});
    fetchTopTags(18).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, q, tag]);

  const submitSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(sp.toString());
    if (qLocal) params.set('q', qLocal);
    else params.delete('q');
    params.delete('tag');
    params.set('page', '1');
    router.push(`/explore?${params.toString()}`);
  };

  const setSort = (value) => {
    const params = new URLSearchParams(sp.toString());
    params.set('sort', value);
    params.set('page', '1');
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Top controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form onSubmit={submitSearch} className="flex items-center gap-2">
          <Input
            placeholder="Search posts or #tags"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            className="w-64 bg-gray-900 border-gray-800"
          />
          <Button type="submit">Search</Button>
        </form>

        <div className="ml-auto flex gap-2">
          {['trending','recent','top'].map((s) => (
            <Button
              key={s}
              variant={s === sort ? 'default' : 'outline'}
              onClick={() => setSort(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Tag pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tagsTop?.map((t) => (
          <Link
            key={t.id}
            href={`/explore/tags/${encodeURIComponent(t.tag)}`}
            className="px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-sm hover:bg-gray-800"
          >
            #{t.tag} <span className="text-gray-400">({t.postsCount})</span>
          </Link>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <Skeleton className="w-full aspect-square bg-gray-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {items.map((p) => (
            <Card key={p.id} className="bg-gray-900 border-gray-800 overflow-hidden">
              <Link href={`/post/${p.id}`}>
                <CardContent className="p-0">
                  {/* If you store thumbnails, prefer thumbnailUrl; else mediaUrl fallback */}
                  <img
                    src={p.thumbnailUrl || p.mediaUrl || '/placeholder.png'}
                    alt={p.title || 'Post'}
                    className="w-full aspect-square object-cover"
                  />
                </CardContent>
              </Link>
              <div className="p-3 flex items-center gap-2 border-t border-gray-800">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={p.author?.avatar || undefined} />
                  <AvatarFallback className="bg-gray-700 text-white text-xs">
                    {(p.author?.username || '?')[0]?.toUpperCase?.() || '?'}
                  </AvatarFallback>
                </Avatar>
                <Link
                  href={`/profile/${encodeURIComponent(p.author?.username || '')}`}
                  className="text-sm font-medium hover:underline truncate"
                >
                  {p.author?.username}
                </Link>
                <div className="ml-auto flex gap-1">
                  {(p.tags || []).slice(0, 2).map((t) => (
                    <Link
                      key={t.id}
                      href={`/explore/tags/${encodeURIComponent(t.name)}`}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      #{t.name}
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">No results.</div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
