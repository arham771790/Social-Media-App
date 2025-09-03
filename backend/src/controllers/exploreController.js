// src/controllers/exploreController.js
import { StatusCodes } from "http-status-codes";
import prisma from "../utils/db.js";

/**
 * GET /explore
 * Query:
 *  - q: string (search in post title/content or tag)
 *  - sort: 'trending' | 'recent' | 'top'
 *  - page, limit
 *  - tag: (optional) explicit tag filter here also works
 */
export const getExploreFeed = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const tag = (req.query.tag || "").trim();
    const sort = (req.query.sort || "trending").toLowerCase();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    const where = { isPublic: true };
    if (q) {
      where.OR = [
        { title:   { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { tags: { some: { name: { contains: q.replace(/^#/, ""), mode: "insensitive" } } } },
      ];
    }
    if (tag) {
      where.tags = { some: { name: { equals: tag.replace(/^#/, ""), mode: "insensitive" } } };
    }

    // Sorting: trending (most impressions recently), recent (newest), top (most likes)
    let orderBy = [{ createdAt: "desc" }]; // fallback
    if (sort === "recent") {
      orderBy = [{ createdAt: "desc" }];
    } else if (sort === "top") {
      // Emulate "top" by # of likes (bookmarked/liked relations may be used)
      orderBy = [{ likedBy: { _count: "desc" } }, { createdAt: "desc" }];
    } else if (sort === "trending") {
      // trending by recent impressions (last 7 days) then recency
      // We can't directly sort by subquery easily; fetch ids first by impressions window.
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const counts = await prisma.postImpression.groupBy({
        by: ["postId"],
        where: { viewedAt: { gte: since } },
        _count: { postId: true },
        orderBy: { _count: { postId: "desc" } },
        take: 1000, // cap
      });
      const trendingIds = counts.map((c) => c.postId);
      // If there is a search/tag filter, we’ll still filter on where
      // We’ll do a two-step: fetch page from where and then sort by custom trending order
      const posts = await prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          tags: true,
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      });

      const rank = new Map(trendingIds.map((id, i) => [id, i]));
      const sorted = posts.sort((a, b) => {
        const ra = rank.has(a.id) ? rank.get(a.id) : Number.POSITIVE_INFINITY;
        const rb = rank.has(b.id) ? rank.get(b.id) : Number.POSITIVE_INFINITY;
        if (ra !== rb) return ra - rb;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      const total = await prisma.post.count({ where });
      return res.status(StatusCodes.OK).json({
        items: sorted,
        total,
        page,
        limit,
      });
    }

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          tags: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    res.status(StatusCodes.OK).json({ items, total, page, limit });
  } catch (e) {
    console.error("getExploreFeed error", e);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load explore" });
  }
};

/**
 * GET /explore/tags
 * Query: limit=20
 * Returns a list of trending tags with counts
 */
export const getTrendingTags = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 50);

    // Count posts per tag and sort by count desc
    const tagCounts = await prisma.tag.findMany({
      include: {
        _count: { select: { posts: true } },
      },
      orderBy: { posts: { _count: "desc" } },
      take: limit,
    });

    const items = tagCounts.map((t, i) => ({
      id: t.id,
      tag: t.name,
      postsCount: t._count.posts,
      rank: i + 1,
    }));

    res.status(StatusCodes.OK).json(items);
  } catch (e) {
    console.error("getTrendingTags error", e);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load tags" });
  }
};

/**
 * GET /explore/tags/search?q=phot
 * Quick tag search/autocomplete
 */
export const searchTags = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(StatusCodes.OK).json([]);

    const items = await prisma.tag.findMany({
      where: { name: { contains: q.replace(/^#/, ""), mode: "insensitive" } },
      select: { id: true, name: true, posts: { select: { id: true }, take: 1 } },
      orderBy: { name: "asc" },
      take: 20,
    });

    res.status(StatusCodes.OK).json(
      items.map((t) => ({ id: t.id, tag: t.name }))
    );
  } catch (e) {
    console.error("searchTags error", e);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Tag search failed" });
  }
};

/**
 * GET /explore/tags/:tag
 * Paged feed for a single tag
 */
export const getTagFeed = async (req, res) => {
  try {
    const tag = (req.params.tag || "").trim().replace(/^#/, "");
    if (!tag) return res.status(StatusCodes.BAD_REQUEST).json({ error: "Tag required" });

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 60);

    const where = {
      isPublic: true,
      tags: { some: { name: { equals: tag, mode: "insensitive" } } },
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatar: true } },
          tags: true,
        },
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    res.status(StatusCodes.OK).json({ items, total, page, limit, tag });
  } catch (e) {
    console.error("getTagFeed error", e);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load tag feed" });
  }
};
