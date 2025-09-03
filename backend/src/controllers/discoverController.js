  // src/controllers/discoverController.js
  import prisma from "../utils/db.js";
  import { StatusCodes } from "http-status-codes";

  /**
   * GET /discover/suggestions
   * Query params:
   *  - page=1
   *  - limit=24
   *  - q=searchText (optional, matches username contains)
   *
   * Excludes the viewer themself and accounts already followed (ACCEPTED).
   * Ranks by mutuals then followersCount. Supports pagination after ranking.
   */
  export const getSuggestions = async (req, res) => {
    try {
      const userId = String(req.userId);
      const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit || "24", 10), 1), 50);
      const q     = (req.query.q || "").trim();

      // 1) Exclusions: self + already following (ACCEPTED)
      const acceptedFollowing = await prisma.follow.findMany({
        where: { followerId: userId, status: "ACCEPTED" },
        select: { followingId: true },
      });
      const excludeIds = new Set(acceptedFollowing.map(f => f.followingId));
      excludeIds.add(userId);

      // 2) Candidate pool (oversample for ranking)
      const where = {
        isPublic: true,
        id: { notIn: Array.from(excludeIds) },
        ...(q ? { username: { contains: q, mode: "insensitive" } } : {}),
      };

      const oversample = limit * 8; // oversample so ranking produces better lists
      const candidates = await prisma.user.findMany({
        where,
        select: { id: true, username: true, avatar: true },
        orderBy: { username: "asc" },
        take: oversample,
      });

      if (!candidates.length) {
        return res.status(StatusCodes.OK).json({
          items: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }

      const candidateIds = candidates.map(c => c.id);

      // 3) Followers count per candidate (ACCEPTED)
      const followerCounts = await prisma.follow.groupBy({
        by: ["followingId"],
        where: { followingId: { in: candidateIds }, status: "ACCEPTED" },
        _count: { followingId: true },
      });
      const followersMap = new Map(
        followerCounts.map(r => [r.followingId, r._count.followingId])
      );

      // 4) Mutuals: I follow someone who also follows candidate (ACCEPTED)
      const myFollowingIds = acceptedFollowing.map(r => r.followingId);
      let mutualsMap = new Map();
      if (myFollowingIds.length) {
        const mutualRows = await prisma.follow.groupBy({
          by: ["followingId"],
          where: {
            followerId: { in: myFollowingIds },
            followingId: { in: candidateIds },
            status: "ACCEPTED",
          },
          _count: { followingId: true },
        });
        mutualsMap = new Map(
          mutualRows.map(r => [r.followingId, r._count.followingId])
        );
      }

      // 5) Rank then paginate
      const ranked = candidates
        .map(c => ({
          id: c.id,
          username: c.username,
          profilePicture: c.avatar || null,
          followersCount: followersMap.get(c.id) || 0,
          mutualsCount: mutualsMap.get(c.id) || 0,
          isFollowing: false, // excluded above
        }))
        .sort((a, b) => {
          if (b.mutualsCount !== a.mutualsCount) return b.mutualsCount - a.mutualsCount;
          return b.followersCount - a.followersCount;
        });

      const total = ranked.length;
      const pages = Math.max(Math.ceil(total / limit), 1);
      const start = (page - 1) * limit;
      const items = ranked.slice(start, start + limit);

      return res.status(StatusCodes.OK).json({
        items,
        pagination: { page, limit, total, pages },
      });
    } catch (err) {
      console.error("getSuggestions error:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load suggestions" });
    }
  };

  /**
   * GET /discover/trending?limit=10
   * (unchanged from your previous version—keep as-is)
   */
  export const getTrending = async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);

      const tags = await prisma.tag.findMany({
        select: { id: true, name: true, _count: { select: { posts: true } } },
        orderBy: { posts: { _count: "desc" } },
        take: limit,
      });

      if (tags.length) {
        return res.status(StatusCodes.OK).json(
          tags.map((t, i) => ({
            id: t.id,
            tag: t.name,
            postsCount: t._count.posts,
            rank: i + 1,
          }))
        );
      }

      // Optional fallback code (omitted here for brevity)
      return res.status(StatusCodes.OK).json([]);
    } catch (err) {
      console.error("getTrending error:", err);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to load trending" });
    }
  };
