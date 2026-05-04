'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

export default function PostHeader({
    author,
    createdAt,
    isOwnPost,
    isFollowing,
    followPending,
    onFollow,
    onUnfollow
}) {
    const profileHref = author?.username ? `/u/${author.username}` : `/users/${author.id}`;
    const isPending = followPending[String(author.id)];

    return (
        <div className="p-3 sm:p-4 flex items-center justify-between">
            <Link href={profileHref} className="flex items-center space-x-3 group/author truncate">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
                    <AvatarImage src={author.avatar} />
                    <AvatarFallback>{author.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="truncate">
                    <p className="font-semibold text-foreground truncate group-hover/author:underline">
                        {author.username}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                    </p>
                </div>
            </Link>

            <div className="flex items-center gap-2">
                {!isOwnPost && (
                    isFollowing ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onUnfollow}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Following'}
                        </Button>
                    ) : (
                        <Button size="sm" onClick={onFollow} disabled={isPending}>
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Follow'}
                        </Button>
                    )
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {isOwnPost ? (
                            <>
                                <DropdownMenuItem>Edit post</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete post</DropdownMenuItem>
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
