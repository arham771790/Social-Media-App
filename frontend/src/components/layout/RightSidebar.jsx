"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Hash } from "lucide-react";
import { useSocialStore } from "@/store/socialStore";
import { useToast } from "@/hooks/use-toast";

/* ---------- Simple local cache with TTL ---------- */
const RS_CACHE_KEY = "rightSidebarCache:v1";
const RS_TTL_MS = 3 * 60 * 1000; // 3 minutes

function loadCache() {
  try {
    const raw = localStorage.getItem(RS_CACHE_KEY);
    if (!raw) return null;
    const { ts, suggestions, trending } = JSON.parse(raw);
    if (Date.now() - ts > RS_TTL_MS) return null;
    return {
      suggestions: Array.isArray(suggestions) ? suggestions : [],
      trending: Array.isArray(trending) ? trending : [],
    };
  } catch {
    return null;
  }
}
function saveCache(suggestions, trending) {
  try {
    localStorage.setItem(
      RS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), suggestions, trending })
    );
  } catch {}
}

export default function RightSidebar() {
  const { toast } = useToast();
  const {
    discover,
    fetchSuggestions,
    fetchTrending,
    followUser,
    unfollowUser,
  } = useSocialStore();

  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [localTrending, setLocalTrending] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  const loading = discover?.loading || { suggestions: false, trending: false };
  const error = discover?.error || null;

  useEffect(() => {
    setHydrated(true);
    const cached = loadCache();
    if (cached) {
      setLocalSuggestions(cached.suggestions);
      setLocalTrending(cached.trending);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [sugs, tags] = await Promise.all([
          fetchSuggestions(6).catch(() => null),
          fetchTrending(10).catch(() => null),
        ]);
        if (cancelled) return;

        const freshSuggestions = Array.isArray(sugs) ? sugs : (discover?.suggestions || []);
        const freshTrending = Array.isArray(tags) ? tags : (discover?.trending || []);

        setLocalSuggestions(Array.isArray(freshSuggestions) ? freshSuggestions : []);
        setLocalTrending(Array.isArray(freshTrending) ? freshTrending : []);
        saveCache(freshSuggestions, freshTrending);
      } catch {
        // ignore; use cache if any
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollowToggle = async (candidate) => {
    try {
      // optimistic UI
      setLocalSuggestions((prev) =>
        prev.map((x) =>
          x.id === candidate.id ? { ...x, isFollowing: !x.isFollowing } : x
        )
      );
      if (candidate.isFollowing) {
        await unfollowUser(candidate.id);
        toast({ title: "Unfollowed", description: `@${candidate.username}` });
      } else {
        await followUser(candidate.id);
        toast({ title: "Following", description: `@${candidate.username}` });
      }
      // refresh suggestions
      fetchSuggestions(6).then((arr) => {
        if (Array.isArray(arr)) {
          setLocalSuggestions(arr);
          saveCache(arr, localTrending);
        }
      });
    } catch {
      // revert optimistic on error
      setLocalSuggestions((prev) =>
        prev.map((x) =>
          x.id === candidate.id ? { ...x, isFollowing: candidate.isFollowing } : x
        )
      );
      toast({
        variant: "destructive",
        title: "Action failed",
        description: "Please try again.",
      });
    }
  };

  const suggestions = useMemo(
    () =>
      (hydrated ? localSuggestions : []) ??
      (Array.isArray(discover?.suggestions) ? discover.suggestions : []),
    [hydrated, localSuggestions, discover?.suggestions]
  );

  const trending = useMemo(
    () =>
      (hydrated ? localTrending : []) ??
      (Array.isArray(discover?.trending) ? discover.trending : []),
    [hydrated, localTrending, discover?.trending]
  );

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
          {loading.suggestions && suggestions.length === 0 ? (
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
                        {(s.username || "?").charAt(0).toUpperCase()}
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
                        {s.mutualsCount ? ` · ${s.mutualsCount} mutual` : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={s.isFollowing ? "outline" : "default"}
                    className={
                      s.isFollowing
                        ? "border-gray-600 text-gray-300 hover:bg-gray-800"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }
                    onClick={() => handleFollowToggle(s)}
                  >
                    {s.isFollowing ? "Following" : "Follow"}
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
              No suggestions right now. Explore more creators on{" "}
              <Link href="/discover/people" className="text-blue-400 hover:text-blue-300">
                People
              </Link>
              .
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
          {loading.trending && trending.length === 0 ? (
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
                  key={tag.id ?? tag.tag}
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
                  <span className="text-xs text-gray-500">
                    #{(tag.rank ?? index + 1)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-400">Nothing trending yet.</div>
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
        <p className="text-gray-600">© {new Date().getFullYear()} Instagram Clone</p>
      </div>
    </div>
  );
}
