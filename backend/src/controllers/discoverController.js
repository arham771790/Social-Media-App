import discoverService from '../services/DiscoverService.js';
import feedService from '../services/FeedService.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';

class DiscoverController {
  getSuggestions = catchAsync(async (req, res, next) => {
    const { page = 1, limit = 24, q } = req.query;
    const result = await discoverService.getSuggestions(req.userId, parseInt(page), parseInt(limit), q);
    res.status(StatusCodes.OK).json(result);
  });

  getTrending = catchAsync(async (req, res, next) => {
    const { limit = 10 } = req.query;
    const tags = await feedService.getTrendingTags(parseInt(limit));
    res.status(StatusCodes.OK).json(tags);
  });
}

export default new DiscoverController();
