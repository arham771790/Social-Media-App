import prisma from '../utils/db.js';

class TagRepository {
  async findMany(where, orderBy, skip, take) {
    return prisma.tag.findMany({
      where,
      orderBy,
      skip,
      take,
      select: { id: true, name: true, _count: { select: { posts: true } } },
    });
  }

  async count(where) {
    return prisma.tag.count({ where });
  }

  async upsert(name) {
    return prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });
  }

  async findByName(name) {
    return prisma.tag.findUnique({
      where: { name },
      select: { id: true, name: true },
    });
  }

  async findPopular(limit) {
    return prisma.tag.findMany({
      orderBy: { posts: { _count: 'desc' } },
      take: limit,
      select: { id: true, name: true, _count: { select: { posts: true } } },
    });
  }
}

export default new TagRepository();
