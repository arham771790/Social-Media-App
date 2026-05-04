import userService from '../services/UserService.js';
import { StatusCodes } from 'http-status-codes';
import { 
  UpdateUserRequestSchema, 
  UpdateSettingsRequestSchema,
  UserResponseDto,
  UserProfileResponseDto
} from '../dtos/UserDto.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class UserController {
  me = catchAsync(async (req, res, next) => {
    const user = await userService.getMe(req.userId);
    res.status(StatusCodes.OK).json(UserResponseDto(user));
  });

  updateProfile = catchAsync(async (req, res, next) => {
    const parsed = UpdateUserRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await userService.updateProfile(req.userId, parsed.data);
    res.status(StatusCodes.OK).json(UserResponseDto(updated));
  });

  getUserProfile = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { user, canViewContent, followStatus } = await userService.getProfile(id, req.userId);
    res.status(StatusCodes.OK).json(UserProfileResponseDto(user, req.userId, canViewContent, followStatus));
  });

  getUserByUsername = catchAsync(async (req, res, next) => {
    const { username } = req.params;
    const { user, canViewContent, followStatus } = await userService.getProfileByUsername(username, req.userId);
    res.status(StatusCodes.OK).json(UserProfileResponseDto(user, req.userId, canViewContent, followStatus));
  });

  searchUsers = catchAsync(async (req, res, next) => {
    const { q, page = 1, limit = 20 } = req.query;
    const result = await userService.searchUsers(q, parseInt(page), parseInt(limit), req.userId);
    res.status(StatusCodes.OK).json(result);
  });

  getSettings = catchAsync(async (req, res, next) => {
    const settings = await userService.getSettings(req.userId);
    res.status(StatusCodes.OK).json(settings);
  });

  updateSettings = catchAsync(async (req, res, next) => {
    const parsed = UpdateSettingsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const updated = await userService.updateSettings(req.userId, parsed.data);
    res.status(StatusCodes.OK).json(updated);
  });
}

export default new UserController();
