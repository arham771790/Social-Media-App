// src/app/(main)/post/[id]/page.jsx
import { Suspense } from 'react';
import PostDetailContainer from '@/components/feed/PostDetailContainer';
import PostSkeleton from '@/components/feed/PostSkeleton';

export default function PostDetailPage({ params }) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostDetailContainer postId={params.id} />
    </Suspense>
  );
}
