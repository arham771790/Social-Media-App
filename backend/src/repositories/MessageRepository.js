import prisma from '../utils/db.js';

class MessageRepository {
  async findGroupsByUser(userId) {
    return prisma.chatGroup.findMany({
      where: {
        OR: [
          { members: { some: { id: userId } } },
          { admins: { some: { id: userId } } },
        ],
        archived: false,
      },
      include: {
        members: { select: { id: true, username: true, avatar: true } },
        admins: { select: { id: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, username: true, avatar: true } } },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async countUnreadMessages(chatGroupId, userId) {
    return prisma.message.count({
      where: {
        chatGroupId,
        senderId: { not: userId },
        readBy: { none: { id: userId } },
      },
    });
  }

  async countTotalUnread(userId) {
      return prisma.message.count({
          where: { senderId: { not: userId }, readBy: { none: { id: userId } } },
      });
  }

  async findDirectChat(directKey) {
    return prisma.chatGroup.findUnique({
      where: { directKey },
      include: { members: { select: { id: true, username: true, avatar: true } } },
    });
  }

  async createChatGroup(data) {
    return prisma.chatGroup.create({
      data,
      include: {
        members: { select: { id: true, username: true, avatar: true } },
        admins: { select: { id: true } },
      },
    });
  }

  async findGroupById(id, options = {}) {
    const { select, include, ...rest } = options;
    
    if (select) {
      return prisma.chatGroup.findUnique({
        where: { id },
        select,
        ...rest
      });
    }

    return prisma.chatGroup.findUnique({
      where: { id },
      include: {
        members: { select: { id: true, username: true, avatar: true } },
        admins: { select: { id: true } },
        ...include,
        ...rest // Catch any other relations passed directly
      }
    });
  }

  async updateChatGroup(id, data) {
    return prisma.chatGroup.update({
      where: { id },
      data,
      include: {
        members: { select: { id: true, username: true, avatar: true } },
        admins: { select: { id: true } },
      }
    });
  }

  async findMessages(where, orderBy, skip, take, include = {}) {
    return prisma.message.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        readBy: { select: { id: true } },
        ...include
      }
    });
  }

  async countMessages(where) {
    return prisma.message.count({ where });
  }

  async createMessage(data) {
    return prisma.message.create({
      data,
      include: {
        sender: { select: { id: true, username: true, avatar: true } },
        readBy: { select: { id: true } },
      }
    });
  }

  async findUnreadInGroup(chatGroupId, userId) {
      return prisma.message.findMany({
          where: { chatGroupId, senderId: { not: userId }, readBy: { none: { id: userId } } },
          select: { id: true },
      });
  }

  async markAsReadMultiple(messageIds, userId) {
    return prisma.$transaction(
        messageIds.map((id) =>
          prisma.message.update({
            where: { id },
            data: { readBy: { connect: { id: userId } } },
          })
        )
      );
  }
}

export default new MessageRepository();
