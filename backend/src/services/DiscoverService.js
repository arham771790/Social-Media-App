import prisma from '../utils/db.js';
import userRepository from '../repositories/UserRepository.js';
import { StatusCodes } from 'http-status-codes';

class DiscoverService {
  async getSuggestions(userId, page, limit, q) {
    // 1) Exclusions: self + already following (ACCEPTED)
    const acceptedFollowing = await prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
    const excludeIds = new Set(acceptedFollowing.map(f => f.followingId));
    excludeIds.add(userId);

    // 2) Candidate pool
    const where = {
      isPublic: true,
      id: { notIn: Array.from(excludeIds) },
      ...(q ? { username: { contains: q, mode: 'insensitive' } } : {}),
    };

    const oversample = limit * 8;
    const candidates = await userRepository.findMany(where, { username: 'asc' }, 0, oversample, {
        id: true, username: true, avatar: true 
    });

    if (!candidates.length) {
      return { items: [], pagination: { page, limit, total: 0, pages: 0 } };
    }

    const candidateIds = candidates.map(c => c.id);

    // 3) Followers count
    const followerCounts = await prisma.follow.groupBy({
      by: ['followingId'],
      where: { followingId: { in: candidateIds }, status: 'ACCEPTED' },
      _count: { followingId: true },
    });
    const followersMap = new Map(followerCounts.map(r => [r.followingId, r._count.followingId]));

    // 4) Mutuals
    const myFollowingIds = acceptedFollowing.map(r => r.followingId);
    let mutualsMap = new Map();
    if (myFollowingIds.length) {
      const mutualRows = await prisma.follow.groupBy({
        by: ['followingId'],
        where: {
          followerId: { in: myFollowingIds },
          followingId: { in: candidateIds },
          status: 'ACCEPTED',
        },
        _count: { followingId: true },
      });
      mutualsMap = new Map(mutualRows.map(r => [r.followingId, r._count.followingId]));
    }

    // 5) Rank then paginate
    const ranked = candidates
      .map(c => ({
        id: c.id,
        username: c.username,
        profilePicture: c.avatar || null,
        followersCount: followersMap.get(c.id) || 0,
        mutualsCount: mutualsMap.get(c.id) || 0,
        isFollowing: false,
      }))
      .sort((a, b) => {
        if (b.mutualsCount !== a.mutualsCount) return b.mutualsCount - a.mutualsCount;
        return b.followersCount - a.followersCount;
      });

    const total = ranked.length;
    const start = (page - 1) * limit;
    const items = ranked.slice(start, start + limit);

    return {
      items,
      pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) },
    };
  }
}

export default new DiscoverService();
