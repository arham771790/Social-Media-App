import notificationRepository from '../repositories/NotificationRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { io } from '../server.js';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';

class NotificationService {
  async createAndEmit(data) {
    const { recipientId, type, message, relatedUserId, relatedPostId } = data;
    
    const notification = await notificationRepository.create({
      recipientId,
      type,
      message,
      relatedUserId,
      relatedPostId
    });

    let relatedUserUsername = null;
    if (relatedUserId) {
        const u = await userRepository.findById(relatedUserId, { username: true });
        relatedUserUsername = u?.username || null;
    }

    io.to(`user:${recipientId}`).emit('notification:new', {
      ...notification,
      relatedUserUsername,
    });

    return notification;
  }

  async getNotifications(userId, page, limit) {
    const skip = (page - 1) * limit;
    
    const [rowsRaw, totalRaw, unread] = await Promise.all([
      notificationRepository.findMany({ recipientId: userId }, { createdAt: 'desc' }, skip, limit),
      notificationRepository.count({ recipientId: userId }),
      notificationRepository.count({ recipientId: userId, read: false }),
    ]);

    // Filter resolved follow requests (optional optimization, keeping logic from original)
    const reqFollowerIds = [...new Set(
      rowsRaw
        .filter(r => r.type === 'FOLLOW_REQUEST' && r.relatedUserId)
        .map(r => r.relatedUserId)
    )];

    let followerStatusMap = {};
    if (reqFollowerIds.length) {
      const follows = await prisma.follow.findMany({
        where: {
          followingId: userId,
          followerId: { in: reqFollowerIds },
        },
        select: { followerId: true, status: true },
      });
      followerStatusMap = Object.fromEntries(follows.map(f => [f.followerId, f.status]));
    }

    const rows = rowsRaw.filter(r => {
      if (r.type !== 'FOLLOW_REQUEST' || !r.relatedUserId) return true;
      const st = followerStatusMap[r.relatedUserId];
      return !st || st === 'PENDING';
    });

    // Enrich with usernames
    const ids = [...new Set(rows.map(r => r.relatedUserId).filter(Boolean))];
    let idToUsername = {};
    if (ids.length) {
      const users = await userRepository.findMany(
          { id: { in: ids } }, 
          { id: 'asc' }, 
          0, 
          ids.length, 
          { id: true, username: true }
      );
      idToUsername = Object.fromEntries(users.map(u => [u.id, u.username]));
    }

    const notifications = rows.map(r => ({
      ...r,
      relatedUserUsername: r.relatedUserId ? idToUsername[r.relatedUserId] || null : null,
    }));

    return {
      notifications,
      unread,
      pagination: {
        page,
        limit,
        total: totalRaw,
        pages: Math.ceil(totalRaw / limit)
      }
    };
  }

  async markAsRead(userId, id) {
    const notif = await notificationRepository.findById(id);
    if (!notif) throw new AppError('Notification not found', StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);
    if (notif.recipientId !== userId) throw new AppError('Not allowed', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);

    return notificationRepository.update(id, { read: true });
  }

  async markBulkAsRead(userId, ids) {
    return notificationRepository.updateMany(
      { id: { in: ids }, recipientId: userId, read: false },
      { read: true }
    );
  }

  async markAllAsRead(userId) {
    return notificationRepository.updateMany(
      { recipientId: userId, read: false },
      { read: true }
    );
  }
}

export default new NotificationService();
