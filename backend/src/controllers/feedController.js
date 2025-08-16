// controllers/feedController.js
import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";

/**
 * Helper: map Prisma post to API shape used across controllers
 * Adds: tags[], isLiked, likesCount, isBookmarked
 */
async function shapePosts(rows, userId) {
  // bookmarks if logged-in
  let bookmarkedPostIds = [];
  if (userId) {
    const userBookmarks = await prisma.user.findUnique({
      where: { id: userId },
      select: { bookmarks: { select: { id: true } } },
    });
    bookmarkedPostIds = userBookmarks?.bookmarks?.map((b) => b.id) || [];
  }

  return rows.map((p) => ({
    ...p,
    tags: p.tags.map((t) => t.name),
    isLiked: userId ? (p.likedBy?.length > 0) : false,
    likesCount: p._count.likedBy,
    isBookmarked: userId ? bookmarkedPostIds.includes(p.id) : false,
    likedBy: undefined,
    _count: undefined,
  }));
}

/**
 * GET /api/feed
 * Authenticated home feed:
 *  - Posts by users the requester follows OR their own posts
 *  - Public posts from others (own posts shown regardless of isPublic)
 *  - Newest first
 * Query: ?page=1&limit=10
 */
export const getHomeFeed = async (req, res) => {
  try {
    const userId = req.userId; // must be set by auth middleware
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Unauthorized" });
    }

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const skip = (page - 1) * limit;

    // who do I follow?
    const followRows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followRows.map((f) => f.followingId);

    // show:
    // - my posts (any visibility)
    // - public posts authored by people I follow
    const where = {
      OR: [
        { authorId: userId }, // my posts
        { AND: [{ authorId: { in: followingIds } }, { isPublic: true }] },
      ],
    };

    // include like status and counts
    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      likedBy: { where: { id: userId }, select: { id: true } },
      _count: { select: { likedBy: true } },
    };

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include,
      }),
      prisma.post.count({ where }),
    ]);

    // if user follows nobody, you can optionally fall back to public recent
    if (!rows.length && !followingIds.length) {
      const [fallbackRows, fallbackTotal] = await Promise.all([
        prisma.post.findMany({
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include,
        }),
        prisma.post.count({ where: { isPublic: true } }),
      ]);
      const posts = await shapePosts(fallbackRows, userId);
      return res.status(StatusCodes.OK).json({
        posts,
        pagination: { page, limit, total: fallbackTotal, pages: Math.ceil(fallbackTotal / limit) },
      });
    }

    const posts = await shapePosts(rows, userId);

    return res.status(StatusCodes.OK).json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getHomeFeed error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to load feed" });
  }
};

/**
 * GET /api/posts/explore
 * Public explore feed:
 *  - Public posts only
 *  - Sorted by popularity (likes) then recency
 *  - Optional tag filter: ?tag=xyz
 * Query: ?page=1&limit=12&tag=react
 */
export const getExploreFeed = async (req, res) => {
  try {
    const userId = req.userId || null; // optional
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "12", 10), 1), 100);
    const skip = (page - 1) * limit;
    const tag = (req.query.tag || "").toString().trim();

    const where = {
      isPublic: true,
      ...(tag ? { tags: { some: { name: tag } } } : {}),
    };

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      ...(userId ? { likedBy: { where: { id: userId }, select: { id: true } } } : {}),
      _count: { select: { likedBy: true } },
    };

    // Popularity first, then recency
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [
          { likedBy: { _count: "desc" } },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include,
      }),
      prisma.post.count({ where }),
    ]);

    const posts = await shapePosts(rows, userId);

    return res.status(StatusCodes.OK).json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("getExploreFeed error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to load explore feed" });
  }
};
