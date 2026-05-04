import prisma from '../utils/db.js';

class PostRepository {
  async create(data) {
    const { tags, authorId, parentPostId, ...rest } = data;
    
    return prisma.post.create({
      data: {
        ...rest,
        author: { connect: { id: authorId } },
        ...(parentPostId ? { parentPost: { connect: { id: parentPostId } } } : {}),
        ...(tags?.length ? {
          tags: {
            connectOrCreate: tags.map(name => ({
              where: { name },
              create: { name }
            }))
          }
        } : {})
      },
      include: {
        tags: { select: { name: true } },
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likedBy: true } },
      }
    });
  }

  async findById(id, include = {}) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        tags: { select: { name: true } },
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likedBy: true } },
        ...include
      }
    });
  }

  async findMany(where, orderBy, skip, take, include = {}) {
    return prisma.post.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        tags: { select: { name: true } },
        author: { select: { id: true, username: true, avatar: true } },
        _count: { select: { likedBy: true } },
        ...include
      }
    });
  }

  async count(where) {
    return prisma.post.count({ where });
  }

  async update(id, data) {
    const { tags, ...rest } = data;
    return prisma.post.update({
      where: { id },
      data: {
        ...rest,
        ...(tags ? {
          tags: {
            set: [], // Clear existing tags
            connectOrCreate: tags.map(name => ({
              where: { name },
              create: { name }
            }))
          }
        } : {})
      }
    });
  }

  async delete(id) {
    return prisma.post.delete({ where: { id } });
  }

  async findUserBookmarkIds(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bookmarks: { select: { id: true } } }
    });
    return user?.bookmarks.map(b => b.id) || [];
  }

  async isBookmarked(userId, postId) {
    const count = await prisma.user.count({
      where: {
        id: userId,
        bookmarks: { some: { id: postId } }
      }
    });
    return count > 0;
  }

  async getBookmarkStatuses(userId, postIds) {
    if (!userId || !postIds.length) return new Set();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bookmarks: {
          where: { id: { in: postIds } },
          select: { id: true }
        }
      }
    });
    return new Set(user?.bookmarks.map(b => b.id) || []);
  }

  async toggleLike(postId, userId) {
    // Check if liked in a single update attempt if possible, or use a more atomic approach
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { likedBy: { where: { id: userId }, select: { id: true } } }
    });

    const isLiked = post?.likedBy.length > 0;

    return prisma.post.update({
      where: { id: postId },
      data: {
        likedBy: isLiked 
          ? { disconnect: { id: userId } } 
          : { connect: { id: userId } }
      },
      include: { _count: { select: { likedBy: true } } }
    });
  }

  async toggleBookmark(postId, userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bookmarks: { where: { id: postId }, select: { id: true } } }
    });

    const isBookmarked = user?.bookmarks.length > 0;

    await prisma.user.update({
      where: { id: userId },
      data: {
        bookmarks: isBookmarked 
          ? { disconnect: { id: postId } } 
          : { connect: { id: postId } }
      }
    });

    return !isBookmarked;
  }
}

export default new PostRepository();
