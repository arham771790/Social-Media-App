import prisma from '../utils/db.js';

class AuthRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  }

  async findByEmailOrUsername(email, username) {
    return prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
  }

  async createUser(data) {
    return prisma.user.create({ data });
  }

  async updateUser(email, data) {
    return prisma.user.update({
      where: { email },
      data,
    });
  }

  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }
}

export default new AuthRepository();
