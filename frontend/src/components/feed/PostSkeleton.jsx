import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const PostSkeleton = () => {
  return (
    <Card className="bg-card border-border overflow-hidden mb-6">
      {/* Header Skeleton */}
      <div className="p-4 flex items-center space-x-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Media Skeleton */}
      <Skeleton className="w-full h-80" />

      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        
        {/* Tags Skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Actions Skeleton */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-6 h-6" />
            <Skeleton className="w-6 h-6" />
          </div>
          <Skeleton className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};

export default PostSkeleton;