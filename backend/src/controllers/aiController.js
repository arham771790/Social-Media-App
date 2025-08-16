// controllers/aiController.js
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { aiGenerateTags, aiSuggestCaptions } from "../utils/aiClient.js";
// controllers/aiController.js (append these)
import { aiMediaAwareCaptions, aiTitleFromContent } from "../utils/aiClient.js";

const mediaCaptionSchema = z.object({
  labels: z.array(z.string()).optional(),  // e.g., FE vision labels
  mime: z.string().optional(),             // "image/jpeg", "video/mp4"
  context: z.string().optional(),          // optional text
  tone: z.enum(["friendly", "playful", "professional", "inspirational", "casual"]).optional(),
  count: z.number().int().min(1).max(20).optional(),
});

/**
 * POST /api/ai/captions/media
 * Body: { labels?: string[], mime?: string, context?: string, tone?: 'friendly'|..., count?: number }
 */
export const suggestMediaAwareCaptions = async (req, res) => {
  try {
    const parsed = mediaCaptionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });
    }
    const captions = await aiMediaAwareCaptions(parsed.data);
    return res.status(StatusCodes.OK).json({ captions });
  } catch (err) {
    console.error("suggestMediaAwareCaptions error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to suggest media-aware captions" });
  }
};

const titleSchema = z.object({
  content: z.string().min(1),
  maxLen: z.number().int().min(20).max(120).optional(),
});

/**
 * POST /api/ai/title-from-content
 * Body: { content: string, maxLen?: number(20..120) }
 */
export const titleFromContent = async (req, res) => {
  try {
    const parsed = titleSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });
    }
    const title = await aiTitleFromContent(parsed.data);
    return res.status(StatusCodes.OK).json({ title });
  } catch (err) {
    console.error("titleFromContent error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to generate title" });
  }
};


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

/**
 * POST /api/ai/generate-tags
 * Body: { title?, content?, mediaHints?: string[], max?: number }
 */
export const generateTags = async (req, res) => {
  try {
    const parsed = tagsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });
    }
    const tags = await aiGenerateTags(parsed.data);
    return res.status(StatusCodes.OK).json({ tags });
  } catch (err) {
    console.error("generateTags error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to generate tags" });
  }
};

/**
 * POST /api/ai/suggest-captions
 * Body: { title?, content?, tone?: 'friendly'|'playful'|'professional'|'inspirational'|'casual', count?: number }
 */
export const suggestCaptions = async (req, res) => {
  try {
    const parsed = captionsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });
    }
    const captions = await aiSuggestCaptions(parsed.data);
    return res.status(StatusCodes.OK).json({ captions });
  } catch (err) {
    console.error("suggestCaptions error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to suggest captions" });
  }
};
