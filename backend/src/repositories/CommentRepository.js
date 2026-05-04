import prisma from '../utils/db.js';

class CommentRepository {
  async create(data) {
    return prisma.comment.create({
      data,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
    });
  }

  async findById(id, include = {}) {
    return prisma.comment.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        ...include
      }
    });
  }

  async findMany(where, orderBy, skip, take, include = {}) {
    return prisma.comment.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        ...include
      }
    });
  }

  async count(where) {
    return prisma.comment.count({ where });
  }

  async findAllByPost(postId) {
    return prisma.comment.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      }
    });
  }

  async deleteMany(ids) {
    return prisma.comment.deleteMany({
      where: { id: { in: ids } }
    });
  }
}

export default new CommentRepository();
