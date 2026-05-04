import tagRepository from '../repositories/TagRepository.js';
import postRepository from '../repositories/PostRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

class TagService {
  async getTags(q, page, limit) {
    const skip = (page - 1) * limit;
    const where = q ? { name: { contains: q, mode: 'insensitive' } } : {};

    const [rows, total] = await Promise.all([
      tagRepository.findMany(where, { name: 'asc' }, skip, limit),
      tagRepository.count(where),
    ]);

    const tags = rows.map(t => ({
      id: t.id,
      name: t.name,
      postsCount: t._count.posts,
    }));

    return {
      tags,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async createTag(name) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new AppError('Tag name must be at least 2 characters.', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    return tagRepository.upsert(trimmed);
  }

  async getPopularTags(limit) {
    const popular = await tagRepository.findPopular(limit);
    return popular.map(t => ({
      id: t.id,
      name: t.name,
      postsCount: t._count.posts,
    }));
  }

  async getPostsByTag(name, page, limit, userId) {
    const tag = await tagRepository.findByName(name);
    if (!tag) throw new AppError('Tag not found', StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND);

    const skip = (page - 1) * limit;
    const where = { tags: { some: { name } } };
    
    // We can use PostRepository for this
    const include = {
        author: { select: { id: true, username: true, avatar: true } },
        tags: { select: { name: true } },
        ...(userId ? { likedBy: { where: { id: userId }, select: { id: true } } } : {}),
        _count: { select: { likedBy: true } },
    };

    const [rows, total] = await Promise.all([
      postRepository.findMany(where, { createdAt: 'desc' }, skip, limit, include),
      postRepository.count(where),
    ]);

    const posts = rows.map(p => ({
      ...p,
      tags: p.tags.map(t => t.name),
      isLiked: userId ? (p.likedBy?.length > 0) : false,
      likesCount: p._count.likedBy,
      likedBy: undefined,
      _count: undefined,
    }));

    return {
      tag: tag.name,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

export default new TagService();
