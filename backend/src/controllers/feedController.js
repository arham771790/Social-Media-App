import feedService from '../services/FeedService.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';

class FeedController {
  getHomeFeed = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.query;
    const result = await feedService.getHomeFeed(req.userId, parseInt(page), parseInt(limit));
    res.status(StatusCodes.OK).json(result);
  });

  getExploreFeed = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 12, tag } = req.query;
    const result = await feedService.getExploreFeed(req.userId, parseInt(page), parseInt(limit), tag);
    res.status(StatusCodes.OK).json(result);
  });
}

export default new FeedController();
