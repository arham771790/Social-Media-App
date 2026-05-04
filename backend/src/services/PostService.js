import postRepository from '../repositories/PostRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';

class PostService {
  async createPost(userId, postData) {
    const { tags, ...rest } = postData;
    const type = this._inferPostType(rest);
    
    return postRepository.create({
      ...rest,
      type,
      authorId: userId,
      tags: this._toUniqueTags(tags)
    });
  }

  async getPosts(filters, page, limit, userId) {
    const { type, tag, author } = filters;
    const where = {};
    
    if (type) where.type = type.toUpperCase();
    if (tag) where.tags = { some: { name: tag } };
    if (author) where.authorId = author;

    const skip = (page - 1) * limit;
    
    const include = userId 
      ? { likedBy: { where: { id: userId }, select: { id: true } } }
      : {};

    const [posts, total] = await Promise.all([
      postRepository.findMany(where, { createdAt: 'desc' }, skip, limit, include),
      postRepository.count(where),
    ]);

    const postIds = posts.map(p => p.id);
    const bookmarkSet = userId 
      ? await postRepository.getBookmarkStatuses(userId, postIds)
      : new Set();

    return {
      posts,
      bookmarkIds: Array.from(bookmarkSet),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getPost(id, userId) {
    const include = userId 
      ? { likedBy: { where: { id: userId }, select: { id: true } } }
      : {};

    const [post, isBookmarked] = await Promise.all([
      postRepository.findById(id, include),
      userId ? postRepository.isBookmarked(userId, id) : Promise.resolve(false)
    ]);

    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }

    return { post, isBookmarked };
  }

  async updatePost(id, userId, data) {
    const post = await postRepository.findById(id);
    if (!post || post.authorId !== userId) {
      throw new AppError('Not allowed', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    if (data.tags) {
        data.tags = this._toUniqueTags(data.tags);
    }

    return postRepository.update(id, data);
  }

  async deletePost(id, userId) {
    const post = await postRepository.findById(id);
    if (!post || post.authorId !== userId) {
      throw new AppError('Not allowed', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    return postRepository.delete(id);
  }

  async toggleLike(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
        throw new AppError('Post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }
    return postRepository.toggleLike(postId, userId);
  }

  async toggleBookmark(postId, userId) {
    const post = await postRepository.findById(postId);
    if (!post) {
        throw new AppError('Post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }
    return postRepository.toggleBookmark(postId, userId);
  }

  async replyToPost(userId, parentId, data) {
    const parent = await postRepository.findById(parentId);
    if (!parent) {
      throw new AppError('Parent post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }

    let type = parent.type;
    if (data.mediaUrl) {
      type = data.mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE';
    }

    return postRepository.create({
      ...data,
      type,
      authorId: userId,
      parentPostId: parentId
    });
  }

  async getBookmarkedPosts(userId, page, limit) {
    const skip = (page - 1) * limit;
    
    const where = {
      bookmarkedBy: { some: { id: userId } }
    };

    const [posts, total] = await Promise.all([
      postRepository.findMany(where, { createdAt: 'desc' }, skip, limit, {
        likedBy: { where: { id: userId }, select: { id: true } }
      }),
      postRepository.count(where),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  _inferPostType(body) {
    const t = (body.type || '').toString().toUpperCase();
    if (t === 'POST' || t === 'TEXT') return 'TEXT';
    if (t === 'BLOG') return 'BLOG';
    if (t === 'THREAD') {
      if (body.mediaUrl) return body.mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE';
      return 'TEXT';
    }
    if (['IMAGE', 'VIDEO'].includes(t)) return t;

    if (body.mediaUrl) return body.mediaUrl.endsWith('.mp4') ? 'VIDEO' : 'IMAGE';
    return 'TEXT';
  }

  _toUniqueTags(tags) {
    if (!tags) return [];
    return Array.from(new Set(tags.filter(Boolean)));
  }
}

export default new PostService();
