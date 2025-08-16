import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";

/**
 * GET /api/tags?q=&page=1&limit=30
 * Case-insensitive search with pagination. Sorted A→Z.
 */
export const getTags = async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "30", 10), 1), 100);
    const skip = (page - 1) * limit;

    const where = q
      ? { name: { contains: q, mode: "insensitive" } }
      : {};

    const [rows, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        select: { id: true, name: true, _count: { select: { posts: true } } },
      }),
      prisma.tag.count({ where }),
    ]);

    const tags = rows.map(t => ({
      id: t.id,
      name: t.name,
      postsCount: t._count.posts,
    }));

    res.status(StatusCodes.OK).json({
      tags,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Failed to fetch tags:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch tags" });
  }
};

/**
 * POST /api/tags
 * Body: { name }
 * Creates a tag if it doesn't exist (idempotent).
 * (If you want only admins to create, put auth/isAdmin middleware here.)
 */
export const createTag = async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    if (name.length < 2) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Tag name must be at least 2 characters." });
    }

    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });

    res.status(StatusCodes.CREATED).json(tag);
  } catch (err) {
    console.error("Failed to create tag:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create tag" });
  }
};

/**
 * GET /api/tags/popular?limit=20
 * Returns top tags by number of posts.
 */
export const getPopularTags = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);

    // Aggregate top tags by post count
    const popular = await prisma.tag.findMany({
      orderBy: { posts: { _count: "desc" } },
      take: limit,
      select: { id: true, name: true, _count: { select: { posts: true } } },
    });

    res.status(StatusCodes.OK).json(
      popular.map(t => ({ id: t.id, name: t.name, postsCount: t._count.posts }))
    );
  } catch (err) {
    console.error("Failed to get popular tags:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get popular tags" });
  }
};

/**
 * GET /api/tags/:name/posts?page=1&limit=20
 * Fetch posts for a tag, newest first, with author + tags.
 */
export const getPostsByTag = async (req, res) => {
  try {
    const { name } = req.params;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;
    const userId = req.userId; // may be undefined (public allowed)

    // Ensure tag exists
    const tag = await prisma.tag.findUnique({ where: { name }, select: { id: true, name: true } });
    if (!tag) return res.status(StatusCodes.NOT_FOUND).json({ error: "Tag not found" });

    const where = { tags: { some: { name } } };

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      ...(userId
        ? { likedBy: { where: { id: userId }, select: { id: true } } }
        : {}),
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

    const posts = rows.map(p => ({
      ...p,
      tags: p.tags.map(t => t.name),
      isLiked: userId ? (p.likedBy?.length > 0) : false,
      likesCount: p._count.likedBy,
      likedBy: undefined,
      _count: undefined,
    }));

    res.status(StatusCodes.OK).json({
      tag: tag.name,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Failed to fetch posts by tag:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch posts by tag" });
  }
};
