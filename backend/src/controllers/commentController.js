import commentService from '../services/CommentService.js';
import { StatusCodes } from 'http-status-codes';
import { CreateCommentRequestSchema, CommentResponseDto } from '../dtos/CommentDto.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class CommentController {
  createComment = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const parsed = CreateCommentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const comment = await commentService.createComment(req.userId, postId, parsed.data);
    res.status(StatusCodes.CREATED).json(CommentResponseDto(comment));
  });

  getComments = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { mode = 'tree', page = 1, limit = 50 } = req.query;
    
    const result = await commentService.getComments(postId, mode, parseInt(page), parseInt(limit));
    
    if (mode === 'tree') {
        res.status(StatusCodes.OK).json(result.map(c => CommentResponseDto(c)));
    } else {
        res.status(StatusCodes.OK).json({
            comments: result.comments.map(c => CommentResponseDto(c)),
            pagination: result.pagination
        });
    }
  });

  getCommentReplies = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { page = 1, limit = 20, order = 'asc' } = req.query;
    
    const result = await commentService.getReplies(id, parseInt(page), parseInt(limit), order);
    res.status(StatusCodes.OK).json({
        replies: result.replies.map(c => CommentResponseDto(c)),
        parentCommentId: id,
        pagination: result.pagination
    });
  });

  deleteComment = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await commentService.deleteComment(req.userId, id);
    res.status(StatusCodes.OK).json({ message: 'Deleted' });
  });
}

export default new CommentController();
