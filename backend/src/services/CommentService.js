import commentRepository from '../repositories/CommentRepository.js';
import postRepository from '../repositories/PostRepository.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import prisma from '../utils/db.js';
import { io } from '../server.js';
import logger from '../utils/logger.js';

class CommentService {
  async createComment(userId, postId, data) {
    const { content, parentId } = data;

    const post = await postRepository.findById(postId);
    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }

    if (parentId) {
      const parent = await commentRepository.findById(parentId);
      if (!parent || parent.postId !== postId) {
        throw new AppError('Invalid parent comment', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
      }
    }

    const comment = await commentRepository.create({
      content,
      author: { connect: { id: userId } },
      post: { connect: { id: postId } },
      ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
    });

    if (post.authorId !== userId) {
      this._notifyAuthor(post.authorId, userId, postId);
    }

    return comment;
  }

  async getComments(postId, mode, page, limit) {
    const post = await postRepository.findById(postId);
    if (!post) {
      throw new AppError('Post not found', StatusCodes.NOT_FOUND, ErrorCodes.POST_NOT_FOUND);
    }

    if (mode === 'flat') {
      const skip = (page - 1) * limit;
      const [comments, total] = await Promise.all([
        commentRepository.findMany({ postId }, { createdAt: 'asc' }, skip, limit),
        commentRepository.count({ postId }),
      ]);
      return { comments, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    // Tree mode
    const comments = await commentRepository.findAllByPost(postId);
    return this._buildTree(comments);
  }

  async getReplies(commentId, page, limit, order = 'asc') {
    const parent = await commentRepository.findById(commentId);
    if (!parent) {
      throw new AppError('Comment not found', StatusCodes.NOT_FOUND, ErrorCodes.VALIDATION_ERROR);
    }

    const skip = (page - 1) * limit;
    const [replies, total] = await Promise.all([
      commentRepository.findMany({ parentId: commentId }, { createdAt: order }, skip, limit),
      commentRepository.count({ parentId: commentId }),
    ]);

    return { replies, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteComment(userId, commentId) {
    const comment = await commentRepository.findById(commentId);
    if (!comment) {
      throw new AppError('Comment not found', StatusCodes.NOT_FOUND, ErrorCodes.VALIDATION_ERROR);
    }

    if (comment.authorId !== userId) {
      throw new AppError('Not allowed', StatusCodes.FORBIDDEN, ErrorCodes.AUTH_FORBIDDEN);
    }

    // Tree deletion
    const allComments = await commentRepository.findAllByPost(comment.postId);
    const idsToDelete = this._getSubtreeIds(allComments, commentId);

    await commentRepository.deleteMany(idsToDelete);
  }

  _buildTree(comments) {
    const map = {};
    comments.forEach((c) => (map[c.id] = { ...c, replies: [] }));
    const roots = [];
    comments.forEach((c) => {
      if (c.parentId) {
        if (map[c.parentId]) map[c.parentId].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  }

  _getSubtreeIds(comments, rootId) {
    const ids = [];
    const byParent = new Map();
    comments.forEach((c) => {
      const arr = byParent.get(c.parentId || '__root__') || [];
      arr.push(c);
      byParent.set(c.parentId || '__root__', arr);
    });

    const stack = [rootId];
    while (stack.length) {
      const cur = stack.pop();
      ids.push(cur);
      const kids = byParent.get(cur) || [];
      kids.forEach((k) => stack.push(k.id));
    }
    return ids;
  }

  async _notifyAuthor(recipientId, senderId, postId) {
    try {
      const notif = await prisma.notification.create({
        data: {
          type: 'COMMENT',
          message: 'New comment on your post',
          recipientId,
          relatedUserId: senderId,
          relatedPostId: postId,
        },
      });
      io.to(`user:${recipientId}`).emit('notification:new', notif);
    } catch (e) {
      logger.error('Failed to notify author of comment', { error: e.message, recipientId, postId });
    }
  }
}

export default new CommentService();
