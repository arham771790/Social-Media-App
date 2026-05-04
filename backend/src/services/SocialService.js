import socialRepository from '../repositories/SocialRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';

class SocialService {
  async followUser(followerId, followingId, followerUsername) {
    if (followerId === followingId) {
      throw new AppError('You cannot follow yourself.', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const targetUser = await userRepository.findById(followingId, { id: true, isPublic: true });
    if (!targetUser) {
      throw new AppError('User not found.', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    }

    const existing = await socialRepository.findFollow(followerId, followingId);
    if (existing) {
        return {
          status: existing.status,
          isFollowing: existing.status === 'ACCEPTED',
          isPending: existing.status === 'PENDING',
        };
    }

    const status = targetUser.isPublic ? 'ACCEPTED' : 'PENDING';
    await socialRepository.createFollow(followerId, followingId, status);

    if (status === 'PENDING') {
        await this._createNotification(followingId, 'FOLLOW_REQUEST', 'wants to follow you', followerId);
    } else {
        await this._createNotification(followingId, 'FOLLOW', 'started following you', followerId);
    }

    return {
      status,
      isFollowing: status === 'ACCEPTED',
      isPending: status === 'PENDING',
    };
  }

  async unfollowUser(followerId, followingId) {
    await socialRepository.deleteFollowMany({ followerId, followingId });
  }

  async acceptRequest(followingId, followerId) {
    const reqRow = await socialRepository.findFollow(followerId, followingId);
    if (!reqRow || reqRow.status !== 'PENDING') {
      throw new AppError('Pending request not found', StatusCodes.NOT_FOUND, ErrorCodes.VALIDATION_ERROR);
    }

    await socialRepository.updateFollow(followerId, followingId, { 
      status: 'ACCEPTED', 
      respondedAt: new Date() 
    });

    await this._createNotification(followerId, 'FOLLOW_ACCEPTED', 'accepted your follow request', followingId);
    
    // Mark follow request notification as read
    await prisma.notification.updateMany({
      where: {
        recipientId: followingId,
        type: 'FOLLOW_REQUEST',
        relatedUserId: followerId,
        read: false,
      },
      data: { read: true },
    });
  }

  async declineRequest(followingId, followerId) {
    const reqRow = await socialRepository.findFollow(followerId, followingId);
    if (!reqRow || reqRow.status !== 'PENDING') {
      throw new AppError('Pending request not found', StatusCodes.NOT_FOUND, ErrorCodes.VALIDATION_ERROR);
    }

    await socialRepository.updateFollow(followerId, followingId, { 
      status: 'DECLINED', 
      respondedAt: new Date() 
    });

    await prisma.notification.updateMany({
      where: {
        recipientId: followingId,
        type: 'FOLLOW_REQUEST',
        relatedUserId: followerId,
        read: false,
      },
      data: { read: true },
    });
  }

  async getFollowers(userId, page, limit, viewerId) {
    const skip = (page - 1) * limit;
    
    await this._checkVisibility(userId, viewerId);

    const [follows, total] = await Promise.all([
      socialRepository.getFollowers(userId, skip, limit),
      socialRepository.countFollowers(userId),
    ]);

    const followers = follows.map((f) => ({
      ...f.follower,
      isOnline: !!f.follower.settings?.showActivityStatus,
      lastSeen: f.follower.settings?.privacyLastSeen ? new Date() : null,
      followedAt: f.createdAt,
    }));

    return {
      followers,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getFollowing(userId, page, limit, viewerId) {
    const skip = (page - 1) * limit;

    await this._checkVisibility(userId, viewerId);

    const [follows, total] = await Promise.all([
      socialRepository.getFollowing(userId, skip, limit),
      socialRepository.countFollowing(userId),
    ]);

    const following = follows.map((f) => ({
      ...f.following,
      isOnline: !!f.following.settings?.showActivityStatus,
      lastSeen: f.following.settings?.privacyLastSeen ? new Date() : null,
      followedAt: f.createdAt,
    }));

    return {
      following,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getFollowRequests(userId, direction, page, limit) {
    const skip = (page - 1) * limit;
    const where = direction === 'outgoing'
      ? { followerId: userId, status: 'PENDING' }
      : { followingId: userId, status: 'PENDING' };

    const include = direction === 'outgoing'
      ? { following: { select: { id: true, username: true, avatar: true, isPublic: true } } }
      : { follower: { select: { id: true, username: true, avatar: true, isPublic: true } } };

    const [rows, total] = await Promise.all([
      socialRepository.getFollowRequests(where, skip, limit, include),
      socialRepository.countFollowRequests(where),
    ]);

    const items = direction === 'outgoing'
      ? rows.map((r) => ({ ...r.following, requestedAt: r.createdAt }))
      : rows.map((r) => ({ ...r.follower, requestedAt: r.createdAt }));

    return {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async addContact(userId, contactId) {
    if (userId === contactId) {
      throw new AppError('You cannot add yourself.', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    await socialRepository.addContact(userId, contactId);
  }

  async getContacts(userId) {
    return socialRepository.getContacts(userId);
  }

  async createStory(userId, data) {
    const { mediaUrl, type, caption, isPublic } = data;
    if (!mediaUrl || !type) {
      throw new AppError('mediaUrl and type are required.', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return socialRepository.createStory({
      userId,
      mediaUrl,
      type,
      caption: caption || null,
      isPublic: typeof isPublic === 'boolean' ? isPublic : true,
      createdAt: now,
      expiresAt,
    });
  }

  async getStories(id, viewerId) {
    const now = new Date();
    const where = id
      ? { userId: id, expiresAt: { gt: now } }
      : { isPublic: true, expiresAt: { gt: now } };

    // Basic visibility check for personal stories
    if (id && id !== viewerId) {
        await this._checkVisibility(id, viewerId);
    }

    return socialRepository.getStories(where);
  }

  async deleteStory(userId, storyId) {
    const story = await socialRepository.findStoryById(storyId);
    if (!story) {
      throw new AppError('Story not found.', StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);
    }
    if (story.userId !== userId) {
      throw new AppError('Not allowed.', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }
    await socialRepository.deleteStory(storyId);
  }

  async _checkVisibility(userId, viewerId) {
    if (userId === viewerId) return;
    const user = await userRepository.findById(userId, { isPublic: true });
    if (!user) throw new AppError('User not found.', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    
    if (!user.isPublic) {
        const follow = await socialRepository.findFollow(viewerId, userId);
        if (follow?.status !== 'ACCEPTED') {
            throw new AppError('This account is private.', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
        }
    }
  }

  async _createNotification(recipientId, type, message, relatedUserId) {
    try {
        await prisma.notification.create({
            data: { recipientId, type, message, relatedUserId },
        });
        // Note: Real-time emission would go here (importing io)
    } catch (e) {
        logger.error('Failed to create notification', { error: e.message, type, recipientId });
    }
  }
}

export default new SocialService();
