import { z } from 'zod';

export const UpdateUserRequestSchema = z.object({
  avatar: z.string().url().optional(),
  bio: z.string().max(256).optional(),
  isPublic: z.boolean().optional(),
});

export const UpdateSettingsRequestSchema = z.object({
  darkMode: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  notificationPush: z.boolean().optional(),
  showActivityStatus: z.boolean().optional(),
  language: z.string().min(2).max(10).optional(),
  privacyProfile: z.boolean().optional(),
  privacyLastSeen: z.boolean().optional(),
});

export const UserResponseDto = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  isPublic: user.isPublic,
  settings: user.settings ? {
    showActivityStatus: user.settings.showActivityStatus,
    privacyLastSeen: user.settings.privacyLastSeen,
  } : undefined,
});

export const UserProfileResponseDto = (user, currentUserId, canViewContent, followStatus) => ({
  id: user.id,
  username: user.username,
  avatar: user.avatar,
  bio: user.bio,
  isPublic: user.isPublic,
  followStatus,
  isOnline: !!user.settings?.showActivityStatus,
  lastSeen: user.settings?.privacyLastSeen ? new Date() : null, // This should probably be a real date from presence service
  canViewContent,
  _count: user._count,
});
