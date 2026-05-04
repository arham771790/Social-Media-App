import userRepository from '../repositories/UserRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { io } from '../server.js';

class UserService {
  async getMe(userId) {
    const user = await userRepository.findById(userId, {
      id: true,
      username: true,
      email: true,
      avatar: true,
      bio: true,
      isPublic: true,
      settings: {
        select: {
          showActivityStatus: true,
          privacyLastSeen: true,
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    }

    return user;
  }

  async updateProfile(userId, data) {
    return userRepository.update(userId, data);
  }

  async getProfile(id, currentUserId) {
    const user = await userRepository.findById(id, {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      isPublic: true,
      settings: {
        select: {
          showActivityStatus: true,
          privacyLastSeen: true,
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    });

    if (!user) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    }

    const followStatus = await this._getFollowStatus(currentUserId, id);
    const canViewContent = user.isPublic || followStatus === 'ACCEPTED' || currentUserId === id;

    return { user, canViewContent, followStatus };
  }

  async getProfileByUsername(username, currentUserId) {
    const user = await userRepository.findByUsername(username, {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      isPublic: true,
      settings: {
        select: {
          showActivityStatus: true,
          privacyLastSeen: true,
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    });

    if (!user) {
      throw new AppError('Profile not found', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    }

    const followStatus = await this._getFollowStatus(currentUserId, user.id);
    const canViewContent = user.isPublic || followStatus === 'ACCEPTED' || currentUserId === user.id;

    return { user, canViewContent, followStatus };
  }

  async searchUsers(query, page, limit, currentUserId) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      userRepository.search(query, skip, limit),
      userRepository.countSearch(query),
    ]);

    const userIds = users.map(u => u.id);
    const followStatuses = await userRepository.getFollowStatuses(currentUserId, userIds);

    const usersWithStatus = users.map(user => ({
      ...user,
      followStatus: followStatuses[user.id] || 'NONE'
    }));

    return {
      users: usersWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getSettings(userId) {
    let settings = await userRepository.getSettings(userId);
    if (!settings) {
      settings = await userRepository.createSettings(userId);
    }
    return settings;
  }

  async updateSettings(userId, data) {
    const before = await this.getSettings(userId);
    const updated = await userRepository.updateSettings(userId, data);

    if (data.showActivityStatus !== undefined && data.showActivityStatus !== before.showActivityStatus) {
      io.to(`user:${userId}`).emit('settings:presence-updated', {
        showActivityStatus: updated.showActivityStatus,
      });
    }

    return updated;
  }

  async _getFollowStatus(followerId, followingId) {
    if (!followerId || followerId === followingId) return 'NONE';
    const follow = await userRepository.checkFollowStatus(followerId, followingId);
    return follow?.status || 'NONE';
  }
}

export default new UserService();
