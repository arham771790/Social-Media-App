import prisma from '../utils/db.js';
import postRepository from '../repositories/PostRepository.js';
import userRepository from '../repositories/UserRepository.js';

class FeedService {
  async getHomeFeed(userId, page, limit) {
    const skip = (page - 1) * limit;

    // Follows
    const followRows = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = followRows.map((f) => f.followingId);

    const where = {
      OR: [
        { authorId: userId },
        { AND: [{ authorId: { in: followingIds } }, { isPublic: true }] },
      ],
    };

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      likedBy: { where: { id: userId }, select: { id: true } },
      _count: { select: { likedBy: true } },
    };

    let [rows, total] = await Promise.all([
      postRepository.findMany(where, { createdAt: 'desc' }, skip, limit, include),
      postRepository.count(where),
    ]);

    // Fallback if empty and follows nobody
    if (!rows.length && !followingIds.length) {
      const fallbackWhere = { isPublic: true };
      [rows, total] = await Promise.all([
        postRepository.findMany(fallbackWhere, { createdAt: 'desc' }, skip, limit, include),
        postRepository.count(fallbackWhere),
      ]);
    }

    const posts = await this.shapePosts(rows, userId);
    return {
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getExploreFeed(userId, page, limit, tag, q, sort = 'trending') {
    const skip = (page - 1) * limit;
    const where = { isPublic: true };
    
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { tags: { some: { name: { contains: q.replace(/^#/, ''), mode: 'insensitive' } } } },
      ];
    }
    if (tag) {
       where.tags = { some: { name: { equals: tag.replace(/^#/, ''), mode: 'insensitive' } } };
    }

    let orderBy = [{ createdAt: 'desc' }];
    if (sort === 'top') {
        orderBy = [{ likedBy: { _count: 'desc' } }, { createdAt: 'desc' }];
    } else if (sort === 'trending') {
        // Trending logic (simplified for service)
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const counts = await prisma.postImpression.groupBy({
            by: ['postId'],
            where: { viewedAt: { gte: since } },
            _count: { postId: true },
            orderBy: { _count: { postId: 'desc' } },
            take: 1000,
        });
        const trendingIds = counts.map(c => c.postId);
        
        const posts = await postRepository.findMany(where, { createdAt: 'desc' }, skip, limit, {
            author: { select: { id: true, username: true, avatar: true } },
            tags: true,
        });

        const rank = new Map(trendingIds.map((id, i) => [id, i]));
        const sorted = posts.sort((a, b) => {
            const ra = rank.has(a.id) ? rank.get(a.id) : Number.POSITIVE_INFINITY;
            const rb = rank.has(b.id) ? rank.get(b.id) : Number.POSITIVE_INFINITY;
            if (ra !== rb) return ra - rb;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const total = await postRepository.count(where);
        const shaped = await this.shapePosts(sorted, userId);
        return { posts: shaped, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    const include = {
      author: { select: { id: true, username: true, avatar: true } },
      tags: { select: { name: true } },
      ...(userId ? { likedBy: { where: { id: userId }, select: { id: true } } } : {}),
      _count: { select: { likedBy: true } },
    };

    const [rows, total] = await Promise.all([
      postRepository.findMany(where, orderBy, skip, limit, include),
      postRepository.count(where),
    ]);

    const posts = await this.shapePosts(rows, userId);
    return {
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getTrendingTags(limit) {
      const tagCounts = await prisma.tag.findMany({
          include: { _count: { select: { posts: true } } },
          orderBy: { posts: { _count: 'desc' } },
          take: limit,
      });

      return tagCounts.map((t, i) => ({
          id: t.id,
          tag: t.name,
          postsCount: t._count.posts,
          rank: i + 1,
      }));
  }

  async searchTags(q, limit) {
      if (!q) return [];
      const items = await prisma.tag.findMany({
          where: { name: { contains: q.replace(/^#/, ''), mode: 'insensitive' } },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
          take: limit,
      });
      return items.map(t => ({ id: t.id, tag: t.name }));
  }

  async shapePosts(rows, userId) {
    let bookmarkedSet = new Set();
    if (userId && rows.length > 0) {
      const postIds = rows.map(r => r.id);
      bookmarkedSet = await postRepository.getBookmarkStatuses(userId, postIds);
    }

    return rows.map((p) => ({
      ...p,
      tags: p.tags?.map((t) => t.name) || [],
      isLiked: userId ? (p.likedBy?.length > 0) : false,
      likesCount: p._count?.likedBy || 0,
      isBookmarked: userId ? bookmarkedSet.has(p.id) : false,
      likedBy: undefined,
      _count: undefined,
    }));
  }
}

export default new FeedService();
