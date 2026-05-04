import messageService from '../services/MessageService.js';
import { StatusCodes } from 'http-status-codes';
import { 
  CreateDirectChatRequestSchema, 
  CreateGroupChatRequestSchema, 
  SendMessageRequestSchema,
  ChatGroupResponseDto,
  MessageResponseDto
} from '../dtos/MessageDto.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { io } from '../server.js';
import userRepository from '../repositories/UserRepository.js';
import catchAsync from '../utils/catchAsync.js';

class MessageController {
  getChatThreads = catchAsync(async (req, res, next) => {
    const { threads, totalUnread } = await messageService.getChatThreads(req.userId);
    const result = threads.map(t => ChatGroupResponseDto(t, req.userId));
    res.status(StatusCodes.OK).json({ threads: result, totalUnread });
  });

  getUnreadTotal = catchAsync(async (req, res, next) => {
    const total = await messageService.getUnreadTotal(req.userId);
    res.status(StatusCodes.OK).json({ total });
  });

  getMessageableUsers = catchAsync(async (req, res, next) => {
    const { search } = req.query;
    const where = { isPublic: true, id: { not: req.userId } };
    if (search) where.username = { contains: search, mode: "insensitive" };
    
    const users = await userRepository.findMany(where, { username: 'asc' }, 0, 50, { 
        id: true, username: true, avatar: true, bio: true 
    });
    res.status(StatusCodes.OK).json(users);
  });

  createDirectChat = catchAsync(async (req, res, next) => {
    const parsed = CreateDirectChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const { chatGroup } = await messageService.createDirectChat(req.userId, parsed.data.targetUserId);
    res.status(StatusCodes.CREATED).json({ 
      chatGroup: ChatGroupResponseDto(chatGroup, req.userId) 
    });
  });

  createGroupChat = catchAsync(async (req, res, next) => {
    const parsed = CreateGroupChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const groupChat = await messageService.createGroupChat(req.userId, parsed.data);
    res.status(StatusCodes.CREATED).json({ 
      chatGroup: ChatGroupResponseDto(groupChat, req.userId) 
    });
  });

  removeGroupMember = catchAsync(async (req, res, next) => {
    const { chatGroupId, memberId } = req.params;
    await messageService.removeMember(req.userId, chatGroupId, memberId);
    res.status(StatusCodes.OK).json({ ok: true });
  });

  addGroupMembers = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { memberIds } = req.body;
    const updated = await messageService.addMembers(req.userId, chatGroupId, memberIds);
    res.status(StatusCodes.OK).json(ChatGroupResponseDto(updated, req.userId));
  });

  getMessages = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { limit = 50, before } = req.query;
    const { items, pageInfo } = await messageService.getMessages(
        req.userId, 
        chatGroupId, 
        parseInt(limit), 
        before
    );
    
    const result = items.map(m => MessageResponseDto(m));
    res.status(StatusCodes.OK).json({ items: result, pageInfo });
  });

  sendMessage = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const parsed = SendMessageRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const message = await messageService.sendMessage(req.userId, chatGroupId, parsed.data);
    res.status(StatusCodes.CREATED).json(MessageResponseDto(message));
  });

  markMessagesAsRead = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    await messageService.markAsRead(req.userId, chatGroupId);
    res.status(StatusCodes.OK).json({ ok: true });
  });

  typingStart = catchAsync(async (req, res, next) => {
    const { chatGroupId, username } = req.body;
    io.to(String(chatGroupId)).emit("typing:start", { chatGroupId, userId: req.userId, username });
    res.status(StatusCodes.OK).json({ ok: true });
  });

  typingStop = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.body;
    io.to(String(chatGroupId)).emit("typing:stop", { chatGroupId, userId: req.userId });
    res.status(StatusCodes.OK).json({ ok: true });
  });

  getChatPresence = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const users = await messageService.getPresence(req.userId, chatGroupId);
    res.status(StatusCodes.OK).json({ users });
  });

  callOffer = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { sdp, fromUser } = req.body;
    io.to(String(chatGroupId)).emit("call:offer", { sdp, fromUser: fromUser || { id: req.userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  });

  callAnswer = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { sdp, fromUser } = req.body;
    io.to(String(chatGroupId)).emit("call:answer", { sdp, fromUser: fromUser || { id: req.userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  });

  callCandidate = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { candidate, fromUser } = req.body;
    io.to(String(chatGroupId)).emit("call:candidate", { candidate, fromUser: fromUser || { id: req.userId } });
    res.status(StatusCodes.OK).json({ ok: true });
  });

  callEnd = catchAsync(async (req, res, next) => {
    const { chatGroupId } = req.params;
    const { reason } = req.body;
    io.to(String(chatGroupId)).emit("call:end", { reason: reason || "ended" });
    res.status(StatusCodes.OK).json({ ok: true });
  });
}

export default new MessageController();
