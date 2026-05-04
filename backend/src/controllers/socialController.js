import socialService from '../services/SocialService.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';

class SocialController {
  followUser = catchAsync(async (req, res, next) => {
    const { id: followingId } = req.params;
    const result = await socialService.followUser(req.userId, followingId, req.user?.username);
    res.status(StatusCodes.OK).json(result);
  });

  unfollowUser = catchAsync(async (req, res, next) => {
    const { id: followingId } = req.params;
    await socialService.unfollowUser(req.userId, followingId);
    res.status(StatusCodes.OK).json({ ok: true });
  });

  acceptFollowRequest = catchAsync(async (req, res, next) => {
    const { followerId } = req.params;
    await socialService.acceptRequest(req.userId, followerId);
    res.status(StatusCodes.OK).json({ ok: true });
  });

  declineFollowRequest = catchAsync(async (req, res, next) => {
    const { followerId } = req.params;
    await socialService.declineRequest(req.userId, followerId);
    res.status(StatusCodes.OK).json({ ok: true });
  });

  getFollowers = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await socialService.getFollowers(id, parseInt(page), parseInt(limit), req.userId);
    res.status(StatusCodes.OK).json(result);
  });

  getFollowing = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const result = await socialService.getFollowing(id, parseInt(page), parseInt(limit), req.userId);
    res.status(StatusCodes.OK).json(result);
  });

  getFollowRequests = catchAsync(async (req, res, next) => {
    const { direction = 'incoming', page = 1, limit = 20 } = req.query;
    const result = await socialService.getFollowRequests(req.userId, direction, parseInt(page), parseInt(limit));
    res.status(StatusCodes.OK).json(result);
  });

  addContact = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    await socialService.addContact(req.userId, id);
    res.status(StatusCodes.OK).json({ message: 'Contact added.' });
  });

  getContacts = catchAsync(async (req, res, next) => {
    const result = await socialService.getContacts(req.userId);
    res.status(StatusCodes.OK).json(result);
  });

  createStory = catchAsync(async (req, res, next) => {
    const result = await socialService.createStory(req.userId, req.body);
    res.status(StatusCodes.CREATED).json(result);
  });

  getStories = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await socialService.getStories(id, req.userId);
    res.status(StatusCodes.OK).json(result);
  });

  deleteStory = catchAsync(async (req, res, next) => {
    const { storyId } = req.params;
    await socialService.deleteStory(req.userId, storyId);
    res.status(StatusCodes.OK).json({ ok: true });
  });
}

export default new SocialController();
