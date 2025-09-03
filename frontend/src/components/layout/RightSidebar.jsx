'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users, Hash } from 'lucide-react';
import { useSocialStore } from '@/store/socialStore';

export default function RightSidebar() {
  const {
    discover,
    fetchSuggestions,
    fetchTrending,
    followUser,
    unfollowUser,
  } = useSocialStore();

  // Always default to arrays/objects to avoid `.map` crashes
  const suggestions = Array.isArray(discover?.suggestions) ? discover.suggestions : [];
  const trending    = Array.isArray(discover?.trending)    ? discover.trending    : [];
  const loading     = discover?.loading || { suggestions: false, trending: false };
  const error       = discover?.error || null;

  useEffect(() => {
    // fire both; swallow errors (store captures error already)
    fetchSuggestions(6).catch(() => {});
    fetchTrending(10).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollowToggle = async (candidate) => {
    try {
      if (candidate.isFollowing) {
        await unfollowUser(candidate.id);
      } else {
        await followUser(candidate.id);
      }
      // optional: refresh suggestions to reflect new state / replace row
      fetchSuggestions(6).catch(() => {});
    } catch (e) {
      console.error('Follow toggle failed', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Suggestions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Suggestions for you
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading.suggestions ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-gray-700" />
                    <div className="space-y-1">
                      <Skeleton className="w-24 h-4 bg-gray-700" />
                      <Skeleton className="w-16 h-3 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="w-16 h-8 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-0">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={s.profilePicture || s.avatar || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {(s.username || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/u/${encodeURIComponent(s.username)}`}
                        className="font-medium text-white hover:text-gray-300 text-sm"
                      >
                        {s.username}
                      </Link>
                      <p className="text-xs text-gray-400">
                        {Number(s.followersCount || 0).toLocaleString()} followers
                        {s.mutualsCount ? ` · ${s.mutualsCount} mutual` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={s.isFollowing ? 'outline' : 'default'}
                    className={
                      s.isFollowing
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                    onClick={() => handleFollowToggle(s)}
                  >
                    {s.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </div>
              ))}
              <div className="p-4 border-t border-gray-800">
                <Link
                  href="/discover/people"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  See all suggestions
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-400">
              No suggestions right now. Explore more creators on{' '}
              <Link href="/discover/people" className="text-blue-400 hover:text-blue-300">
                People
              </Link>.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trending */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trending
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading.trending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-8 h-8 rounded-md bg-gray-700" />
                    <div className="space-y-1">
                      <Skeleton className="w-24 h-4 bg-gray-700" />
                      <Skeleton className="w-16 h-3 bg-gray-700" />
                    </div>
                  </div>
                  <Skeleton className="w-10 h-4 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="space-y-0">
              {trending.map((tag, index) => (
                <Link
                  key={tag.id}
                  href={`/explore/tags/${encodeURIComponent(tag.tag)}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-800 rounded-lg">
                      <Hash className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">#{tag.tag}</p>
                      <p className="text-xs text-gray-400">
                        {Number(tag.postsCount || 0).toLocaleString()} posts
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">#{tag.rank ?? index + 1}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-400">
              Nothing trending yet.
            </div>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Footer Links */}
      <div className="text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Link href="/about" className="hover:text-gray-400">About</Link>
          <span>•</span>
          <Link href="/help" className="hover:text-gray-400">Help</Link>
          <span>•</span>
          <Link href="/press" className="hover:text-gray-400">Press</Link>
          <span>•</span>
          <Link href="/api" className="hover:text-gray-400">API</Link>
          <span>•</span>
          <Link href="/jobs" className="hover:text-gray-400">Jobs</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/privacy" className="hover:text-gray-400">Privacy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-gray-400">Terms</Link>
          <span>•</span>
          <Link href="/locations" className="hover:text-gray-400">Locations</Link>
        </div>
        <p className="text-gray-600">© 2024 Instagram Clone</p>
      </div>
    </div>
  );
}
