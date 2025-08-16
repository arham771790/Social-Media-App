'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PostCard from './PostCard';
import MediaRenderer from './MediaRenderer';

export default function PostModal({ postId, isOpen, onClose }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !postId) return;
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, isOpen]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch post');
      const data = await response.json();
      setPost(data.post || data);
    } catch (err) {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPost(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Post</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="p-6">
              <PostModalSkeleton />
            </div>
          )}

          {error && (
            <div className="p-6 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchPost} variant="outline" className="border-gray-700 text-white hover:bg-gray-800">
                Try Again
              </Button>
            </div>
          )}

          {post && !loading && (
            <div className="p-0">
              {/* Use PostCard so actions/comments stay consistent */}
              <PostCard post={post} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PostModalSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full bg-gray-800" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 bg-gray-800" />
          <Skeleton className="h-3 w-20 bg-gray-800" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-gray-800" />
        <Skeleton className="h-4 w-4/5 bg-gray-800" />
      </div>
      <Skeleton className="h-96 w-full bg-gray-800 rounded-lg" />
      <div className="flex gap-6 pt-2">
        <Skeleton className="h-8 w-8 bg-gray-800 rounded" />
        <Skeleton className="h-8 w-8 bg-gray-800 rounded" />
        <Skeleton className="h-8 w-8 bg-gray-800 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 bg-gray-800" />
        <Skeleton className="h-3 w-32 bg-gray-800" />
      </div>
    </div>
  );
}
