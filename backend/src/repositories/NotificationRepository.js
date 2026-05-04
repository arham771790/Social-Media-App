import prisma from '../utils/db.js';

class NotificationRepository {
  async create(data) {
    return prisma.notification.create({
      data,
    });
  }

  async findById(id) {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  async findMany(where, orderBy, skip, take) {
    return prisma.notification.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }

  async count(where) {
    return prisma.notification.count({ where });
  }

  async update(id, data) {
    return prisma.notification.update({
      where: { id },
      data,
    });
  }

  async updateMany(where, data) {
    return prisma.notification.updateMany({
      where,
      data,
    });
  }
}

export default new NotificationRepository();
