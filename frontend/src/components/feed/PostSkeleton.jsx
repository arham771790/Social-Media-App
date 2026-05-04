import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PostSkeleton = () => {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/8">
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      <div className="space-y-5 px-4 py-5 sm:px-6">
        <div className="space-y-3">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <Skeleton className="h-80 w-full rounded-[1.75rem]" />

        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/6 px-4 py-4 sm:px-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>
    </Card>
  );
};

export default PostSkeleton;
