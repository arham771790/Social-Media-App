'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSocialStore } from '@/store/socialStore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE = 24;

export default function TagPage() {
  const { tag } = useParams(); // Next passes string
  const router = useRouter();
  const sp = useSearchParams();
  const page = parseInt(sp.get('page') || '1', 10);

  // If someone hits /explore/tags/"" or "undefined", show index instead
  if (!tag || tag === '""' || tag === 'undefined') {
    // Redirect to tags index (we’ll use /explore to show top tags)
    if (typeof window !== 'undefined') router.replace('/explore');
    return null;
  }

  const { explore, fetchTagFeed } = useSocialStore();
  const { items, loading, error } = explore;

  useEffect(() => {
    fetchTagFeed({ tag, page, limit: PAGE_SIZE }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, page]);

  const gotoPage = (p) => {
    const params = new URLSearchParams(sp.toString());
    params.set('page', String(p));
    router.push(`/explore/tags/${encodeURIComponent(tag)}?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">#{tag}</h1>
        <Link
          href="/explore"
          className="text-sm text-blue-400 hover:underline"
        >
          Back to Explore
        </Link>
      </div>

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
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {items.map((p) => (
              <Card key={p.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                <Link href={`/post/${p.id}`}>
                  <CardContent className="p-0">
                    <img
                      src={p.thumbnailUrl || p.mediaUrl || '/placeholder.png'}
                      alt={p.title || 'Post'}
                      className="w-full aspect-square object-cover"
                    />
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              className="px-3 py-1 rounded border border-gray-700 text-sm disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => gotoPage(page - 1)}
            >
              Previous
            </button>
            <span className="text-sm text-gray-400">Page {page}</span>
            <button
              className="px-3 py-1 rounded border border-gray-700 text-sm disabled:opacity-50"
              // naive hasMore—use your total if desired
              onClick={() => gotoPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-gray-400">No posts for this tag.</div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}
