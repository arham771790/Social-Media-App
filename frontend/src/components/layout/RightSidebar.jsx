"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Hash, Sparkles, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocialStore } from "@/store/socialStore";
import { useToast } from "@/hooks/use-toast";

const RS_CACHE_KEY = "rightSidebarCache:v1";
const RS_TTL_MS = 3 * 60 * 1000;

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
      } catch {}
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFollowToggle = async (candidate) => {
    try {
      setLocalSuggestions((prev) =>
        prev.map((entry) =>
          entry.id === candidate.id ? { ...entry, isFollowing: !entry.isFollowing } : entry
        )
      );

      if (candidate.isFollowing) {
        await unfollowUser(candidate.id);
        toast({ title: "Unfollowed", description: `@${candidate.username}` });
      } else {
        await followUser(candidate.id);
        toast({ title: "Following", description: `@${candidate.username}` });
      }

      fetchSuggestions(6).then((arr) => {
        if (Array.isArray(arr)) {
          setLocalSuggestions(arr);
          saveCache(arr, localTrending);
        }
      });
    } catch {
      setLocalSuggestions((prev) =>
        prev.map((entry) =>
          entry.id === candidate.id ? { ...entry, isFollowing: candidate.isFollowing } : entry
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
    <div className="space-y-4">
      <Card className="surface-panel rounded-[2rem] border-white/8">
        <CardHeader className="pb-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Quiet signals
              </div>
              <CardTitle className="text-[1.7rem]">For your next scroll</CardTitle>
            </div>
            <Badge variant="outline" className="border-primary/18 bg-primary/10 text-primary">
              Curated
            </Badge>
          </div>
          <CardDescription>
            Suggestions and tags worth opening next.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="rounded-[2rem] border-white/8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Suggested people
              </div>
              <CardTitle className="text-[1.55rem]">Keep your circle sharp</CardTitle>
            </div>
            <Link href="/discover/people" className="text-muted-foreground transition-colors hover:text-foreground">
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <CardDescription>People who should look natural inside your feed.</CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-2">
          {loading.suggestions && suggestions.length === 0 ? (
            <div className="space-y-3 px-6 pb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-11 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-1 px-2">
              {suggestions.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 rounded-[1.35rem] px-4 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <Avatar className="size-11">
                    <AvatarImage src={candidate.profilePicture || candidate.avatar || undefined} />
                    <AvatarFallback>
                      {(candidate.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/u/${encodeURIComponent(candidate.username)}`}
                      className="block truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {candidate.username}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {Number(candidate.followersCount || 0).toLocaleString()} followers
                      {candidate.mutualsCount ? ` · ${candidate.mutualsCount} mutual` : ""}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={candidate.isFollowing ? "outline" : "default"}
                    className="rounded-full"
                    onClick={() => handleFollowToggle(candidate)}
                  >
                    {candidate.isFollowing ? "Following" : "Follow"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-4 text-sm text-muted-foreground">
              No suggestions right now. Explore more creators on{" "}
              <Link href="/discover/people" className="text-primary hover:text-primary/80">
                People
              </Link>
              .
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-white/8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Trending
              </div>
              <CardTitle className="text-[1.55rem]">Tags with momentum</CardTitle>
            </div>
            <Badge variant="secondary">Live</Badge>
          </div>
          <CardDescription>Topics pulling attention across the network.</CardDescription>
        </CardHeader>

        <CardContent className="px-2 pb-2">
          {loading.trending && trending.length === 0 ? (
            <div className="space-y-3 px-4 pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-[1.2rem] px-2 py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-[1rem]" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="space-y-1">
              {trending.map((tag, index) => (
                <Link
                  key={tag.id ?? tag.tag}
                  href={`/explore/tags/${encodeURIComponent(tag.tag)}`}
                  className="flex items-center justify-between rounded-[1.35rem] px-4 py-3 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-[1rem] border border-white/8 bg-background/28">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">#{tag.tag}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(tag.postsCount || 0).toLocaleString()} posts
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    #{tag.rank ?? index + 1}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 pb-4 text-sm text-muted-foreground">Nothing trending yet.</div>
          )}
        </CardContent>
      </Card>

      {error && <p className="px-1 text-xs text-destructive">{error}</p>}

      <div className="px-1 text-[11px] leading-6 text-muted-foreground">
        <div className="flex flex-wrap gap-x-3">
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/help" className="hover:text-foreground">Help</Link>
          <Link href="/press" className="hover:text-foreground">Press</Link>
          <Link href="/api" className="hover:text-foreground">API</Link>
          <Link href="/jobs" className="hover:text-foreground">Jobs</Link>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/locations" className="hover:text-foreground">Locations</Link>
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
          © {new Date().getFullYear()} Instopedia
        </p>
      </div>
    </div>
  );
}
