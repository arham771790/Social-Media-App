import messageRepository from '../repositories/MessageRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import { io, isUserOnline } from '../server.js';
import prisma from '../utils/db.js';
import logger from '../utils/logger.js';

class MessageService {
  async getChatThreads(userId) {
    const groups = await messageRepository.findGroupsByUser(userId);
    const groupIds = groups.map(g => g.id);

    // Optimized: Get all unread counts in one query
    const unreadStats = await prisma.message.groupBy({
      by: ['chatGroupId'],
      where: {
        chatGroupId: { in: groupIds },
        senderId: { not: userId },
        readBy: { none: { id: userId } }
      },
      _count: { _all: true }
    });

    const unreadMap = new Map(unreadStats.map(s => [s.chatGroupId, s._count._all]));

    const threads = groups.map((g) => ({
      ...g,
      unreadCount: unreadMap.get(g.id) || 0
    }));

    const totalUnread = Array.from(unreadMap.values()).reduce((a, b) => a + b, 0);

    return { threads, totalUnread };
  }

  async getUnreadTotal(userId) {
    return messageRepository.countTotalUnread(userId);
  }

  async createDirectChat(userId, targetUserId) {
    if (userId === targetUserId) {
      throw new AppError('Cannot chat with yourself', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const targetUser = await userRepository.findById(targetUserId, { username: true, avatar: true, isPublic: true });
    if (!targetUser) {
      throw new AppError('User not found', StatusCodes.NOT_FOUND, ErrorCodes.USER_NOT_FOUND);
    }
    if (!targetUser.isPublic) {
      throw new AppError('Cannot message private user', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    const [a, b] = [userId, targetUserId].sort();
    const directKey = `${a}:${b}`;

    let chatGroup = await messageRepository.findDirectChat(directKey);
    if (!chatGroup) {
      chatGroup = await messageRepository.createChatGroup({
        type: 'DIRECT',
        directKey,
        name: `Chat with ${targetUser.username}`,
        createdBy: { connect: { id: userId } },
        members: { connect: [{ id: userId }, { id: targetUserId }] },
        lastActivityAt: new Date(),
      });
    }

    return { chatGroup, targetUser };
  }

  async createGroupChat(userId, groupData) {
    const { name, memberIds, description, imageUrl } = groupData;
    
    const allMembers = Array.from(new Set([...memberIds, userId]));

    const groupChat = await messageRepository.createChatGroup({
      type: 'GROUP',
      name,
      description,
      imageUrl,
      createdBy: { connect: { id: userId } },
      members: { connect: allMembers.map((id) => ({ id })) },
      admins: { connect: { id: userId } },
      lastActivityAt: new Date(),
    });

    return groupChat;
  }

  async removeMember(userId, chatGroupId, memberId) {
    const group = await messageRepository.findGroupById(chatGroupId);
    if (!group) throw new AppError('Group not found', StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);

    const isAdmin = group.admins.some(a => a.id === userId);
    const isSelf = memberId === userId;

    if (!isAdmin && !isSelf) {
      throw new AppError('Only admins can remove other members', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    await messageRepository.updateChatGroup(chatGroupId, {
      members: { disconnect: { id: memberId } },
      admins: { disconnect: { id: memberId } }
    });

    io.to(chatGroupId).emit('group:memberRemoved', { chatGroupId, memberId });
  }

  async addMembers(userId, chatGroupId, memberIds) {
    const group = await messageRepository.findGroupById(chatGroupId);
    if (!group) throw new AppError('Group not found', StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);

    const isAdmin = group.admins.some(a => a.id === userId);
    if (!isAdmin) {
      throw new AppError('Only admins can add members', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    const updated = await messageRepository.updateChatGroup(chatGroupId, {
      members: { connect: memberIds.map(id => ({ id })) }
    });

    io.to(chatGroupId).emit('group:membersAdded', { chatGroupId, memberIds });
    return updated;
  }

  async getMessages(userId, chatGroupId, limit, before) {
    const isMember = await this._ensureMembership(chatGroupId, userId);
    if (!isMember) throw new AppError('Access denied', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);

    const where = { chatGroupId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) };

    // Mark as read
    const unreadMessages = await messageRepository.findUnreadInGroup(chatGroupId, userId);
    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id);
      await messageRepository.markAsReadMultiple(messageIds, userId);
      io.to(chatGroupId).emit('messages:read', { chatGroupId, userId, messageIds });
    }

    const rowsDesc = await messageRepository.findMessages(where, { createdAt: 'desc' }, 0, limit);
    const items = rowsDesc.reverse();
    
    const nextCursor = items.length ? items[0].createdAt : null;
    const hasMore = nextCursor
      ? (await messageRepository.countMessages({ chatGroupId, createdAt: { lt: nextCursor } })) > 0
      : false;

    return { items, pageInfo: { hasMore, before: nextCursor } };
  }

  async sendMessage(userId, chatGroupId, messageData) {
    const { content, mediaUrl, clientTempId, type: rawType, isSystem: rawSys } = messageData;
    
    const isMember = await this._ensureMembership(chatGroupId, userId);
    if (!isMember) throw new AppError('Access denied', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);

    let type = this._inferMessageType(messageData);
    const isSystem = Boolean(rawSys) || type === 'CALL_INVITE';

    const message = await messageRepository.createMessage({
      content: content || null,
      mediaUrl: mediaUrl || null,
      type,
      isSystem,
      sender: { connect: { id: userId } },
      chatGroup: { connect: { id: chatGroupId } },
      readBy: { connect: { id: userId } },
    });

    await messageRepository.updateChatGroup(chatGroupId, {
      lastActivityAt: new Date(),
      lastMessage: { connect: { id: message.id } }
    });

    io.to(chatGroupId).emit('message:new', { chatGroupId, message, clientTempId });

    if (!isSystem) {
       this._notifyMembers(chatGroupId, userId);
    }

    return { ...message, clientTempId };
  }

  async markAsRead(userId, chatGroupId) {
    const isMember = await this._ensureMembership(chatGroupId, userId);
    if (!isMember) throw new AppError('Access denied', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);

    const unread = await messageRepository.findUnreadInGroup(chatGroupId, userId);
    if (unread.length > 0) {
      const messageIds = unread.map(m => m.id);
      await messageRepository.markAsReadMultiple(messageIds, userId);
      io.to(chatGroupId).emit('messages:read', { chatGroupId, userId, messageIds });
    }
  }

  async getPresence(userId, chatGroupId) {
      const isMember = await this._ensureMembership(chatGroupId, userId);
      if (!isMember) throw new AppError('Access denied', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);

      const group = await messageRepository.findGroupById(chatGroupId);
      const uniq = new Map();
      [...(group.members || []), ...(group.admins || [])].forEach(m => uniq.set(m.id, m));

      return Array.from(uniq.values()).map(u => ({
          ...u,
          online: isUserOnline(u.id)
      }));
  }

  async _ensureMembership(chatGroupId, userId) {
    const row = await prisma.chatGroup.findFirst({
        where: {
            id: chatGroupId,
            OR: [
                { members: { some: { id: userId } } },
                { admins: { some: { id: userId } } }
            ]
        },
        select: { id: true }
    });
    return !!row;
  }

  _inferMessageType(data) {
    const { type, content, mediaUrl } = data;
    if (type) return type;
    
    if (!content && !mediaUrl) return 'TEXT'; // Or throw
    if (mediaUrl) {
        if (/\.(mp4|mov|mkv|webm)$/.test(mediaUrl.toLowerCase())) return 'VIDEO';
        if (/\.(png|jpg|jpeg|gif|webp)$/.test(mediaUrl.toLowerCase())) return 'IMAGE';
        return 'FILE';
    }
    return 'TEXT';
  }

  async _notifyMembers(chatGroupId, senderId) {
      try {
          const group = await messageRepository.findGroupById(chatGroupId, {
              members: { select: { id: true } },
              admins: { select: { id: true } }
          });
          
          const recipients = Array.from(new Set([
              ...(group.members || []).map(m => m.id),
              ...(group.admins || []).map(a => a.id)
          ])).filter(id => id !== senderId);

          if (!recipients.length) return;

          // Optimized: Bulk create notifications
          await prisma.notification.createMany({
              data: recipients.map(rid => ({
                  recipientId: rid,
                  type: 'MESSAGE',
                  message: 'New message',
                  relatedUserId: senderId,
              }))
          });

          // Fetch them back for emission (or just emit with enough info)
          // For simplicity and performance, we emit a generic notification object or just a trigger
          // Real apps might use a queue or more complex logic
          recipients.forEach(rid => {
              io.to(`user:${rid}`).emit('notification:new', {
                  type: 'MESSAGE',
                  message: 'New message',
                  relatedUserId: senderId,
                  createdAt: new Date(),
                  read: false
              });
          });
      } catch (e) {
          logger.error('Failed to notify chat members', { error: e.message, chatGroupId });
      }
  }
}

export default new MessageService();
