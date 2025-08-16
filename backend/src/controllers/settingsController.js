import prisma from "../utils/db.js";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { io } from "../server.js";

/**
 * What each field does (matches schema.prisma):
 * - darkMode: UI theme preference
 * - notificationEmail: allow email notifications
 * - notificationPush: allow push (web/mobile) notifications
 * - showActivityStatus: show "online"/typing to others
 * - language: i18n locale code, e.g. "en"
 * - privacyProfile: if true, hide profile details from non-followers
 * - privacyLastSeen: if true, show lastSeen time to others
 */

const settingsSchema = z.object({
  darkMode: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  notificationPush: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  language: z.string().min(2).max(10).optional(),
  privacyProfile: z.boolean().optional(),
  privacyLastSeen: z.boolean().optional(),
});

/** Ensure a settings row exists for the user, returning it */
async function ensureSettings(userId) {
  let settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId }, // defaults from prisma schema apply
    });
  }
  return settings;
}

/**
 * GET /api/user/me/settings
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const settings = await ensureSettings(userId);
    return res.status(StatusCodes.OK).json(settings);
  } catch (err) {
    console.error("getSettings error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch settings" });
  }
};

/**
 * PUT /api/user/me/settings
 * Body: partial settings – only send what you want to change
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.userId;
    // validate partial
    const parsed = settingsSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: parsed.error });
    }

    // ensure row exists
    const before = await ensureSettings(userId);

    // update
    const updated = await prisma.userSettings.update({
      where: { userId },
      data: parsed.data,
    });

    // Optional: broadcast presence preference changes to client UI
    if (parsed.data.showActivityStatus !== undefined && parsed.data.showActivityStatus !== before.showActivityStatus) {
      io.to(`user:${userId}`).emit("settings:presence-updated", {
        showActivityStatus: updated.showActivityStatus,
      });
    }

    return res.status(StatusCodes.OK).json(updated);
  } catch (err) {
    console.error("updateSettings error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to update settings" });
  }
};
