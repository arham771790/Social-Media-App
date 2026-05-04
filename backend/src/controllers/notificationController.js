import notificationService from '../services/NotificationService.js';
import { StatusCodes } from 'http-status-codes';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class NotificationController {
  getNotifications = catchAsync(async (req, res, next) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await notificationService.getNotifications(req.userId, parseInt(page), parseInt(limit));
    res.status(StatusCodes.OK).json(result);
  });

  getUnreadCount = catchAsync(async (req, res, next) => {
    const unread = await notificationService.getNotifications(req.userId, 1, 1);
    res.status(StatusCodes.OK).json({ unreadCount: unread.unread });
  });

  sendNotification = catchAsync(async (req, res, next) => {
    const { recipientId, type, message, relatedUserId, relatedPostId } = req.body;
    const notif = await notificationService.createAndEmit({ recipientId, type, message, relatedUserId, relatedPostId });
    res.status(StatusCodes.CREATED).json(notif);
  });

  markAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updated = await notificationService.markAsRead(req.userId, id);
    res.status(StatusCodes.OK).json(updated);
  });

  markBulkAsRead = catchAsync(async (req, res, next) => {
    const ids = req.body?.ids || [];
    const result = await notificationService.markBulkAsRead(req.userId, ids);
    res.status(StatusCodes.OK).json({ updated: result.count });
  });

  markAllAsRead = catchAsync(async (req, res, next) => {
    const result = await notificationService.markAllAsRead(req.userId);
    res.status(StatusCodes.OK).json({ updated: result.count });
  });

  // Helper for internal use
  createAndEmitNotification = async (data) => {
      return notificationService.createAndEmit(data);
  };
}

export default new NotificationController();
