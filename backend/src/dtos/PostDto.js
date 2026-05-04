import { z } from 'zod';

export const PostType = {
  BLOG: 'BLOG',
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
};

export const CreatePostRequestSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['BLOG', 'TEXT', 'IMAGE', 'VIDEO']).optional(),
  tags: z.array(z.string()).optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  isAnonymous: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  aiDescription: z.string().optional(),
  parentPostId: z.string().optional(),
});

export const UpdatePostRequestSchema = CreatePostRequestSchema.partial();

export const PostResponseDto = (post, userId, isBookmarked = false) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  type: post.type,
  mediaUrl: post.mediaUrl,
  thumbnailUrl: post.thumbnailUrl,
  isAnonymous: post.isAnonymous,
  isPublic: post.isPublic,
  aiDescription: post.aiDescription,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  author: post.author ? {
    id: post.author.id,
    username: post.author.username,
    avatar: post.author.avatar,
  } : null,
  tags: post.tags ? post.tags.map(t => t.name) : [],
  likesCount: post._count?.likedBy || 0,
  isLiked: userId ? (post.likedBy?.length > 0) : false,
  isBookmarked,
});
