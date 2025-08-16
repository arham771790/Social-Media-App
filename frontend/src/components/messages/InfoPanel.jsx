"use client";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function InfoPanel({ thread }) {
  if (!thread) return null;
  return (
    <div className="w-full md:w-72 border-l border-border p-3 space-y-4">
      <h3 className="font-medium">Details</h3>
      <div>
        <h4 className="text-sm text-muted-foreground mb-2">Members</h4>
        <ul className="space-y-2">
          {thread.members?.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={m.avatar || undefined} />
                <AvatarFallback>{m.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <Link href={`/u/${m.username}`} className="text-sm hover:underline truncate">@{m.username}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
