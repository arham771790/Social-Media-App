//postController.js
import prisma from "../utils/db.js";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";

const inferPostType = (body) => {
  // normalize legacy FE values
  const t = (body.type || '').toString().toUpperCase();
  if (t === 'POST') return 'TEXT';
  if (t === 'THREAD') {
    if (body.mediaUrl) return body.mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE';
    return 'TEXT';
  }
  if (['BLOG', 'TEXT', 'IMAGE', 'VIDEO'].includes(t)) return t;

  // infer if missing
  if (body.mediaUrl) return body.mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE';
  return 'TEXT';
};

const toUnique = (arr = []) => Array.from(new Set(arr.filter(Boolean)));


// Zod schema for creating/updating a post or blog
const postSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(1).optional(),
  // Align with Prisma enum PostType: BLOG | TEXT | IMAGE | VIDEO
  type: z.enum(["BLOG", "TEXT", "IMAGE", "VIDEO"]).optional(),
  tags: z.array(z.string()).optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  isAnonymous: z.boolean().optional(),
  isPublic: z.boolean().optional()
});

/**
 * Create a new post/blog/thread
 * @route POST /posts
 */
export const createPost = async (req, res) => {
  try {
    const userId = req.userId;

    const body = { ...req.body };
    // infer/normalize type
    body.type = inferPostType(body);

    // validate
    const schema = z.object({
      title: z.string().min(3).optional(),
      content: z.string().min(1).optional(),
      type: z.enum(['BLOG', 'TEXT', 'IMAGE', 'VIDEO']),
      tags: z.array(z.string()).optional(),
      mediaUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      isAnonymous: z.boolean().optional(),
      isPublic: z.boolean().optional(),
      aiDescription: z.string().optional()
    });
    const result = schema.safeParse(body);
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
    }
    const data = result.data;

    const tagNames = toUnique(data.tags);

    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        aiDescription: data.aiDescription,
        type: data.type,
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        isAnonymous: data.isAnonymous ?? false,
        isPublic: data.isPublic ?? true,
        author: { connect: { id: userId } },
        ...(tagNames?.length
          ? {
              tags: {
                connectOrCreate: tagNames.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              },
            }
          : {}),
      },
      include: {
        tags: { select: { name: true } },
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likedBy: true } },
      },
    });

    res.status(StatusCodes.CREATED).json({
      ...post,
      tags: post.tags.map((t) => t.name),
      likesCount: post._count.likedBy,
      _count: undefined,
    });
  } catch (err) {
    console.error('createPost error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create post' });
  }
};



/**
 * Get all posts/blogs/threads (supports filtering by type, tags, author, trending)
 * @route GET /posts
 */
export const getPosts = async (req, res) => {
  try {
    const userId = req.userId || null; // may be undefined (route is public)
    const { type, tag, author, page = '1', limit = '20' } = req.query;

    // filters
    const where = {};
    if (type && ['BLOG', 'TEXT', 'IMAGE', 'VIDEO'].includes(String(type).toUpperCase())) {
      where.type = String(type).toUpperCase();
    }
    if (tag) where.tags = { some: { name: String(tag) } };
    if (author) where.authorId = String(author);

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * pageSize;

    // Build include dynamically (can't set include fields to false)
    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      _count: { select: { likedBy: true } },
    };
    if (userId) {
      include.likedBy = { where: { id: userId }, select: { id: true } };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include,
      }),
      prisma.post.count({ where }),
    ]);

    // get bookmarks only if userId exists
    let bookmarkedPostIds = [];
    if (userId) {
      const userBookmarks = await prisma.user.findUnique({
        where: { id: userId },
        select: { bookmarks: { select: { id: true } } },
      });
      bookmarkedPostIds = userBookmarks?.bookmarks?.map((b) => b.id) || [];
    }

    const postsWithStatus = posts.map((p) => ({
      ...p,
      tags: p.tags.map((t) => t.name),
      isLiked: userId ? (p.likedBy?.length > 0) : false,
      likesCount: p._count.likedBy,
      isBookmarked: userId ? bookmarkedPostIds.includes(p.id) : false,
      likedBy: undefined,
      _count: undefined,
    }));

    res.status(StatusCodes.OK).json({
      posts: postsWithStatus,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    console.error('getPosts error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch posts' });
  }
};



/**
 * Get a single post/blog/thread by ID
 * @route GET /posts/:id
 */
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || null;

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      _count: { select: { likedBy: true } },
    };
    if (userId) {
      include.likedBy = { where: { id: userId }, select: { id: true } };
    }

    const post = await prisma.post.findUnique({ where: { id }, include });
    if (!post) return res.status(StatusCodes.NOT_FOUND).json({ error: 'Post not found' });

    let isBookmarked = false;
    if (userId) {
      const userBookmarks = await prisma.user.findUnique({
        where: { id: userId },
        select: { bookmarks: { where: { id }, select: { id: true } } },
      });
      isBookmarked = userBookmarks?.bookmarks?.length > 0;
    }

    res.status(StatusCodes.OK).json({
      ...post,
      tags: post.tags.map((t) => t.name),
      isLiked: userId ? (post.likedBy?.length > 0) : false,
      likesCount: post._count.likedBy,
      isBookmarked,
      likedBy: undefined,
      _count: undefined,
    });
  } catch (err) {
    console.error('getPost error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch post' });
  }
};

export const listByAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || null;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 100);
    const skip = (page - 1) * limit;

    const author = await prisma.user.findUnique({ where: { id }, select: { id: true, isPublic: true } });
    if (!author) return res.status(StatusCodes.NOT_FOUND).json({ error: "Author not found" });

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      _count: { select: { likedBy: true } },
    };
    if (userId) include.likedBy = { where: { id: userId }, select: { id: true } };

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: id, isPublic: true },
        orderBy: { createdAt: "desc" },
        skip, take: limit, include,
      }),
      prisma.post.count({ where: { authorId: id, isPublic: true } }),
    ]);

    // bookmarks (only if authed)
    let bookmarkedPostIds = [];
    if (userId) {
      const b = await prisma.user.findUnique({
        where: { id: userId },
        select: { bookmarks: { select: { id: true } } },
      });
      bookmarkedPostIds = b?.bookmarks?.map(x => x.id) || [];
    }

    const posts = rows.map(p => ({
      ...p,
      tags: p.tags.map(t => t.name),
      isLiked: userId ? (p.likedBy?.length > 0) : false,
      likesCount: p._count.likedBy,
      isBookmarked: userId ? bookmarkedPostIds.includes(p.id) : false,
      likedBy: undefined,
      _count: undefined,
    }));

    return res.status(StatusCodes.OK).json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("listByAuthor error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load posts" });
  }
};

/**
 * Update a post/blog/thread (only by author)
 * @route PUT /posts/:id
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = postSchema.partial().safeParse(req.body);
    if (!result.success)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });

    // Check author
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.authorId !== userId)
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not allowed" });

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...result.data,
        tags: result.data.tags ? result.data.tags.join(",") : undefined
      }
    });
    res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to update post" });
  }
};

/**
 * Delete a post/blog/thread (only by author)
 * @route DELETE /posts/:id
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.authorId !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: 'Not allowed' });
    }

    // Optional: if you later store mediaPublicId + resourceType on Post, delete from Cloudinary here
    // try { await deleteFromCloudinary(post.mediaPublicId, post.resourceType || 'image'); } catch (e) { console.warn('Cloudinary delete failed', e); }

    await prisma.post.delete({ where: { id } });
    res.status(StatusCodes.OK).json({ message: 'Deleted' });
  } catch (err) {
    console.error('deletePost error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete post' });
  }
};


/**
 * Like a post/blog/thread
 * @route POST /posts/:id/like
 */
export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Check if user already liked the post
    const existingLike = await prisma.post.findFirst({
      where: { 
        id,
        likedBy: { some: { id: userId } }
      }
    });

    if (existingLike) {
      // Unlike: remove from likedBy
      await prisma.post.update({
        where: { id },
        data: { likedBy: { disconnect: { id: userId } } }
      });
      
      // Get updated like count
      const updatedPost = await prisma.post.findUnique({
        where: { id },
        include: { likedBy: true }
      });
      
      res.status(StatusCodes.OK).json({ 
        message: "Unliked",
        isLiked: false,
        likesCount: updatedPost.likedBy.length
      });
    } else {
      // Like: add to likedBy
      await prisma.post.update({
        where: { id },
        data: { likedBy: { connect: { id: userId } } }
      });
      
      // Get updated like count
      const updatedPost = await prisma.post.findUnique({
        where: { id },
        include: { likedBy: true }
      });
      
      res.status(StatusCodes.OK).json({ 
        message: "Liked",
        isLiked: true,
        likesCount: updatedPost.likedBy.length
      });
    }
  } catch (err) {
    console.error('Like error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to like post" });
  }
};

/**
 * Bookmark a post/blog/thread
 * @route POST /posts/:id/bookmark
 */
export const bookmarkPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    // Check if user already bookmarked the post
    const existingBookmark = await prisma.user.findFirst({
      where: { 
        id: userId,
        bookmarks: { some: { id } }
      }
    });

    if (existingBookmark) {
      // Remove bookmark
      await prisma.user.update({
        where: { id: userId },
        data: { bookmarks: { disconnect: { id } } }
      });
      
      res.status(StatusCodes.OK).json({ 
        message: "Bookmark removed",
        isBookmarked: false
      });
    } else {
      // Add bookmark
      await prisma.user.update({
        where: { id: userId },
        data: { bookmarks: { connect: { id } } }
      });
      
      res.status(StatusCodes.OK).json({ 
        message: "Bookmarked",
        isBookmarked: true
      });
    }
  } catch (err) {
    console.error('Bookmark error:', err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to bookmark post" });
  }
};

/**
 * Share a post/blog/thread (fetch list of users to share with)
 * @route POST /posts/:id/share
 */
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;
    // Implement your sharing logic here (can link to Share model, send notifications, etc)
    res.status(StatusCodes.OK).json({ message: "Shared (mock response, implement logic)" });
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to share post" });
  }
};

/**
 * Reply to a post/thread (threaded/nested posts)
 * @route POST /posts/:id/reply
 * Reply to a post means creating a new Post that is linked as a “child” (threaded/nested) under an existing “parent” Post (the one you’re replying to).
 * It’s not a comment (which would go in the Comment model)—it’s a full post that’s threaded/nested for discussions, forum, or microblog style,   like a “threaded tweet” or “reply post” on Reddit or Threads.
    How it works in your code:
    Endpoint: POST /posts/:id/reply
    Input:
    id in the URL is the parent post ID (the post being replied to)
    Body: { content: "...", isAnonymous: true/false, [mediaUrl: "..."] }
    What it does:
    Checks the parent post exists
    Auto-detects the reply type (inherits parent's, or uses "IMAGE"/"VIDEO" if media is included)
    Creates a new Post in the database:
    Sets its parentPostId to the parent’s ID (threading/nesting)
    Sets authorId to the current user
    All other info as usual
    Returns the created reply post
 */
export const replyPost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = postSchema.pick({ content: true, isAnonymous: true }).safeParse(req.body);
    if (!result.success)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });

    const parent = await prisma.post.findUnique({ where: { id } });
    if (!parent)
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Parent post not found" });

    let type = parent.type; // default: inherit parent
    if (req.body.mediaUrl) {
      type = req.body.mediaUrl.endsWith(".mp4") ? "VIDEO" : "IMAGE";
    }

    const reply = await prisma.post.create({
      data: {
        content: result.data.content,
        isAnonymous: result.data.isAnonymous ?? false,
        type,
        mediaUrl: req.body.mediaUrl,
        author: { connect: { id: userId } },
        parentPost: { connect: { id } }
      }
    });

    res.status(StatusCodes.CREATED).json(reply);
  } catch (err) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to reply to post" });
  }
};

