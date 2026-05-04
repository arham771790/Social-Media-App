'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PostHeader({
  author,
  createdAt,
  isOwnPost,
  isFollowing,
  followPending,
  onFollow,
  onUnfollow,
}) {
  const profileHref = author?.username ? `/u/${author.username}` : `/users/${author.id}`;
  const isPending = followPending[String(author.id)];

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-4 sm:px-6">
      <Link href={profileHref} className="group flex min-w-0 items-center gap-3">
        <Avatar className="size-11">
          <AvatarImage src={author.avatar} />
          <AvatarFallback>{author.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
            {author.username}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Shared {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {!isOwnPost && (
          isFollowing ? (
            <Button size="sm" variant="outline" onClick={onUnfollow} disabled={isPending} className="rounded-full">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Following'}
            </Button>
          ) : (
            <Button size="sm" onClick={onFollow} disabled={isPending} className="rounded-full">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Follow'}
            </Button>
          )
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-10 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isOwnPost ? (
              <>
                <DropdownMenuItem>Edit post</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Delete post</DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuItem>Report post</DropdownMenuItem>
                <DropdownMenuItem>Hide post</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
