import aiService from '../services/AIService.js';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

const mediaCaptionSchema = z.object({
  labels: z.array(z.string()).optional(),
  mime: z.string().optional(),
  context: z.string().optional(),
  tone: z.enum(["friendly", "playful", "professional", "inspirational", "casual"]).optional(),
  count: z.number().int().min(1).max(20).optional(),
});

const titleSchema = z.object({
  content: z.string().min(1),
  maxLen: z.number().int().min(20).max(120).optional(),
});

const tagsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  mediaHints: z.array(z.string()).optional(),
  max: z.number().int().min(1).max(20).optional(),
});

const captionsSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tone: z.enum(["friendly", "playful", "professional", "inspirational", "casual"]).optional(),
  count: z.number().int().min(1).max(20).optional(),
});

class AIController {
  suggestMediaAwareCaptions = catchAsync(async (req, res, next) => {
    const parsed = mediaCaptionSchema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    const captions = await aiService.suggestMediaAwareCaptions(parsed.data);
    res.status(StatusCodes.OK).json({ captions });
  });

  titleFromContent = catchAsync(async (req, res, next) => {
    const parsed = titleSchema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    const title = await aiService.titleFromContent(parsed.data);
    res.status(StatusCodes.OK).json({ title });
  });

  generateTags = catchAsync(async (req, res, next) => {
    const parsed = tagsSchema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    const tags = await aiService.generateTags(parsed.data);
    res.status(StatusCodes.OK).json({ tags });
  });

  suggestCaptions = catchAsync(async (req, res, next) => {
    const parsed = captionsSchema.safeParse(req.body || {});
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    const captions = await aiService.suggestCaptions(parsed.data);
    res.status(StatusCodes.OK).json({ captions });
  });
}

export default new AIController();
