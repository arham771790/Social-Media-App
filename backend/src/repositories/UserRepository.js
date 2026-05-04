import prisma from '../utils/db.js';

class UserRepository {
  async findById(id, select = {}) {
    return prisma.user.findUnique({
      where: { id },
      select: Object.keys(select).length > 0 ? select : undefined,
    });
  }

  async findByUsername(username, select = {}) {
    return prisma.user.findUnique({
      where: { username },
      select: Object.keys(select).length > 0 ? select : undefined,
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async findMany(where, orderBy = { createdAt: 'desc' }, skip = 0, take = 10, select = {}) {
    return prisma.user.findMany({
      where,
      orderBy,
      skip,
      take,
      select: Object.keys(select).length > 0 ? select : undefined,
    });
  }

  async search(query, skip, limit, currentUserId) {
    return prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
        ],
      },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        isPublic: true,
        settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
        _count: { select: { followers: true, following: true, posts: true } },
      },
      orderBy: { username: 'asc' },
    });
  }

  async countSearch(query) {
    return prisma.user.count({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  async getSettings(userId) {
    return prisma.userSettings.findUnique({ where: { userId } });
  }

  async createSettings(userId) {
    return prisma.userSettings.create({ data: { userId } });
  }

  async updateSettings(userId, data) {
    return prisma.userSettings.update({
      where: { userId },
      data,
    });
  }

  async checkFollowStatus(followerId, followingId) {
    return prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
      select: { status: true },
    });
  }

  async getFollowStatuses(followerId, followingIds) {
    if (!followerId || !followingIds.length) return {};
    const follows = await prisma.follow.findMany({
      where: {
        followerId,
        followingId: { in: followingIds },
      },
      select: { followingId: true, status: true },
    });
    return Object.fromEntries(follows.map(f => [f.followingId, f.status]));
  }
}

export default new UserRepository();
