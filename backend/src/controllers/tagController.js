import tagService from '../services/TagService.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';

class TagController {
  getTags = catchAsync(async (req, res, next) => {
    const { q, page = 1, limit = 30 } = req.query;
    const result = await tagService.getTags(q, parseInt(page), parseInt(limit));
    res.status(StatusCodes.OK).json(result);
  });

  createTag = catchAsync(async (req, res, next) => {
    const { name } = req.body;
    const tag = await tagService.createTag(name);
    res.status(StatusCodes.CREATED).json(tag);
  });

  getPopularTags = catchAsync(async (req, res, next) => {
    const { limit = 20 } = req.query;
    const popular = await tagService.getPopularTags(parseInt(limit));
    res.status(StatusCodes.OK).json(popular);
  });

  getPostsByTag = catchAsync(async (req, res, next) => {
    const { name } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await tagService.getPostsByTag(name, parseInt(page), parseInt(limit), req.userId);
    res.status(StatusCodes.OK).json(result);
  });
}

export default new TagController();
