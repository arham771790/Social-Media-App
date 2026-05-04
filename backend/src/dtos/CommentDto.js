import { z } from 'zod';

export const CreateCommentRequestSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  parentId: z.string().uuid().optional(),
});

export const CommentResponseDto = (comment) => ({
  id: comment.id,
  content: comment.content,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  author: {
    id: comment.author.id,
    username: comment.author.username,
    avatar: comment.author.avatar,
  },
  parentId: comment.parentId,
  postId: comment.postId,
  replies: comment.replies || [],
});
