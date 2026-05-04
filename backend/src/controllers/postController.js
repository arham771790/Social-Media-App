import postService from '../services/PostService.js';
import { StatusCodes } from 'http-status-codes';
import { 
  CreatePostRequestSchema, 
  UpdatePostRequestSchema, 
  PostResponseDto 
} from '../dtos/PostDto.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class PostController {
  createPost = catchAsync(async (req, res, next) => {
    const parsed = CreatePostRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const post = await postService.createPost(req.userId, parsed.data);
    res.status(StatusCodes.CREATED).json(PostResponseDto(post, req.userId));
  });

  getPosts = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20, ...filters } = req.query;
    const { posts, bookmarkIds, pagination } = await postService.getPosts(
      filters, 
      parseInt(page), 
      parseInt(limit), 
      req.userId
    );

    const result = posts.map(p => PostResponseDto(p, req.userId, bookmarkIds.includes(p.id)));
    res.status(StatusCodes.OK).json({ posts: result, pagination });
  });

  getPost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { post, isBookmarked } = await postService.getPost(id, req.userId);
    res.status(StatusCodes.OK).json(PostResponseDto(post, req.userId, isBookmarked));
  });

  updatePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const parsed = UpdatePostRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await postService.updatePost(id, req.userId, parsed.data);
    res.status(StatusCodes.OK).json(PostResponseDto(updated, req.userId));
  });

  deletePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await postService.deletePost(id, req.userId);
    res.status(StatusCodes.OK).json({ message: 'Deleted' });
  });

  likePost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updatedPost = await postService.toggleLike(id, req.userId);
    const isLiked = updatedPost.likedBy?.some(u => u.id === req.userId) || false;
    
    res.status(StatusCodes.OK).json({ 
      message: isLiked ? "Liked" : "Unliked",
      isLiked,
      likesCount: updatedPost._count.likedBy
    });
  });

  bookmarkPost = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const isBookmarked = await postService.toggleBookmark(id, req.userId);
    res.status(StatusCodes.OK).json({ 
      message: isBookmarked ? "Bookmarked" : "Bookmark removed",
      isBookmarked
    });
  });

  replyPost = catchAsync(async (req, res, next) => {
    const { id: parentId } = req.params;
    const parsed = CreatePostRequestSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const reply = await postService.replyToPost(req.userId, parentId, parsed.data);
    res.status(StatusCodes.CREATED).json(PostResponseDto(reply, req.userId));
  });

  sharePost = catchAsync(async (req, res) => {
      res.status(StatusCodes.OK).json({ message: "Shared (mock response, implement logic)" });
  });

  getBookmarks = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 20 } = req.query;
    const { posts, pagination } = await postService.getBookmarkedPosts(
      req.userId, 
      parseInt(page), 
      parseInt(limit)
    );

    const result = posts.map(p => PostResponseDto(p, req.userId, true));
    res.status(StatusCodes.OK).json({ posts: result, pagination });
  });

  listByAuthor = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    req.query.author = id;
    return this.getPosts(req, res, next);
  });
}

export default new PostController();
