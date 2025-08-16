'use client';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCommentStore } from '@/store/commentStore';
import { useAuthStore } from '@/store/authStore';

export default function Comments({ postId }) {
  const { user: me } = useAuthStore();
  const { byPost, fetchForPost, addComment, deleteComment, isLoading } = useCommentStore();
  const bucket = byPost[postId];

  const [content, setContent] = useState('');

  useEffect(() => {
    // tree mode so we can show replies inline
    if (!bucket) fetchForPost(postId, { mode: 'tree' }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSubmit = async () => {
    if (!content.trim()) return;
    await addComment(postId, { content: content.trim() });
    setContent('');
  };

  const items = bucket?.items || [];

  return (
    <div className="px-4 pb-4">
      {/* Composer */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="w-9 h-9">
          <AvatarImage src={me?.avatar} />
          <AvatarFallback>{me?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[44px] resize-none"
          />
        </div>
        <Button onClick={onSubmit} disabled={isLoading || !content.trim()}>
          Comment
        </Button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {items.map((c) => (
          <CommentItem
            key={c.id}
            postId={postId}
            comment={c}
            meId={me?.id}
            onDelete={() => deleteComment(c.id, postId)}
          />
        ))}

        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">Be the first to comment.</p>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, postId, meId, onDelete, depth = 0 }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const { addComment } = useCommentStore();

  const submitReply = async () => {
    if (!replyText.trim()) return;
    await addComment(postId, { content: replyText.trim(), parentId: comment.id });
    setReplyText('');
    setShowReply(false);
  };

  return (
    <div className="flex gap-3" style={{ marginLeft: depth ? Math.min(depth, 4) * 16 : 0 }}>
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src={comment.author?.avatar} />
        <AvatarFallback>{comment.author?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.author?.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          {/* IMPORTANT: use `content` (backend shape) */}
          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs">
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setShowReply((s) => !s)}
          >
            Reply
          </button>
          {meId && meId === comment.authorId && (
            <button className="text-destructive" onClick={onDelete}>
              Delete
            </button>
          )}
        </div>

        {showReply && (
          <div className="flex items-start gap-2 mt-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[40px] resize-none"
            />
            <Button size="sm" onClick={submitReply} disabled={!replyText.trim()}>
              Reply
            </Button>
          </div>
        )}

        {/* Render replies (already present in tree mode) */}
        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((r) => (
              <CommentItem
                key={r.id}
                comment={r}
                postId={postId}
                meId={meId}
                onDelete={() => useCommentStore.getState().deleteComment(r.id, postId)}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
