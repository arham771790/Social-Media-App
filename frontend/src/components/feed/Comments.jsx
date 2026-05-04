'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/authStore';
import { useCommentStore } from '@/store/commentStore';

export default function Comments({ postId, onAdded, onDeleted }) {
  const { user: me } = useAuthStore();
  const { byPost, fetchForPost, addComment, deleteComment, isLoading } = useCommentStore();
  const bucket = byPost[postId];
  const [content, setContent] = useState('');
  const items = bucket?.items || [];

  useEffect(() => {
    if (!bucket) fetchForPost(postId, { mode: 'tree' }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSubmit = async () => {
    if (!content.trim()) return;
    await addComment(postId, { content: content.trim() });
    setContent('');
    onAdded?.();
  };

  return (
    <div className="border-t border-white/6 px-4 pb-5 pt-4 sm:px-6">
      <div className="mb-5 flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarImage src={me?.avatar} />
          <AvatarFallback>{me?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 rounded-[1.4rem] border border-white/7 bg-background/20 p-3">
          <Textarea
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[64px] border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={onSubmit} disabled={isLoading || !content.trim()} size="sm" className="rounded-full">
              Comment
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((comment) => (
          <CommentItem
            key={comment.id}
            postId={postId}
            comment={comment}
            meId={me?.id}
            onAdded={onAdded}
            onDeleted={onDeleted}
            onDelete={async () => {
              await deleteComment(comment.id, postId);
              onDeleted?.();
            }}
          />
        ))}

        {!isLoading && items.length === 0 && (
          <div className="rounded-[1.3rem] border border-dashed border-white/8 px-4 py-5 text-sm text-muted-foreground">
            Be the first to comment.
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, postId, meId, onDelete, onAdded, onDeleted, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { addComment } = useCommentStore();

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await addComment(postId, { content: replyText.trim(), parentId: comment.id });
    setReplyText('');
    setShowReply(false);
    onAdded?.();
  };

  return (
    <div className="flex gap-3" style={{ marginLeft: depth ? Math.min(depth, 4) * 18 : 0 }}>
      <Avatar className="mt-1 size-8">
        <AvatarImage src={comment.author?.avatar} />
        <AvatarFallback>{comment.author?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="rounded-[1.25rem] border border-white/7 bg-background/20 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium tracking-[-0.01em] text-foreground">
              {comment.author?.username}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground/86">
            {comment.content}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs">
          <button
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowReply((s) => !s)}
          >
            Reply
          </button>
          {meId && meId === comment.authorId && (
            <button className="text-destructive transition-opacity hover:opacity-80" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>

        {showReply && (
          <div className="mt-3 rounded-[1.2rem] border border-white/7 bg-background/16 p-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[52px] border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex justify-end">
              <Button size="sm" onClick={submitReply} disabled={!replyText.trim()} className="rounded-full">
                Reply
              </Button>
            </div>
          </div>
        )}

        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div className="mt-4 space-y-3 border-l border-white/7 pl-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                meId={meId}
                onAdded={onAdded}
                onDeleted={onDeleted}
                onDelete={async () => {
                  await useCommentStore.getState().deleteComment(reply.id, postId);
                  onDeleted?.();
                }}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
