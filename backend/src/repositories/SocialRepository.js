import prisma from '../utils/db.js';

class SocialRepository {
  async findFollow(followerId, followingId) {
    return prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  }

  async createFollow(followerId, followingId, status) {
    return prisma.follow.create({
      data: { followerId, followingId, status },
    });
  }

  async updateFollow(followerId, followingId, data) {
    return prisma.follow.update({
      where: { followerId_followingId: { followerId, followingId } },
      data,
    });
  }

  async deleteFollow(id) {
    return prisma.follow.delete({ where: { id } });
  }

  async deleteFollowMany(where) {
    return prisma.follow.deleteMany({ where });
  }

  async getFollowers(userId, skip, limit) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: 'ACCEPTED' },
      skip,
      take: limit,
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowing(userId, skip, limit) {
    return prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      skip,
      take: limit,
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFollowRequests(where, skip, limit, include) {
    return prisma.follow.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include,
    });
  }

  async countFollowers(userId) {
    return prisma.follow.count({ where: { followingId: userId, status: 'ACCEPTED' } });
  }

  async countFollowing(userId) {
    return prisma.follow.count({ where: { followerId: userId, status: 'ACCEPTED' } });
  }

  async countFollowRequests(where) {
    return prisma.follow.count({ where });
  }

  async addContact(userId, contactId) {
    return prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { contacts: { connect: { id: contactId } } },
      }),
      prisma.user.update({
        where: { id: contactId },
        data: { contacts: { connect: { id: userId } } },
      }),
    ]);
  }

  async getContacts(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { contacts: { select: { id: true, username: true, avatar: true } } },
    });
    return user?.contacts || [];
  }

  async createStory(data) {
    return prisma.story.create({
      data,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });
  }

  async findStoryById(id) {
    return prisma.story.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
  }

  async deleteStory(id) {
    return prisma.story.delete({ where: { id } });
  }

  async getStories(where) {
    return prisma.story.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });
  }
}

export default new SocialRepository();
