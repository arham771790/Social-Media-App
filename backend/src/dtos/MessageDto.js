import { z } from 'zod';

export const CreateDirectChatRequestSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const CreateGroupChatRequestSchema = z.object({
  name: z.string().min(1),
  memberIds: z.array(z.string().uuid()).min(2),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const SendMessageRequestSchema = z.object({
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  clientTempId: z.string().optional(),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'CALL_INVITE']).optional(),
  isSystem: z.boolean().optional(),
});

export const ChatGroupResponseDto = (group, userId) => {
  const others = group.members?.filter(m => m.id !== userId) || [];
  return {
    id: group.id,
    name: group.type === 'DIRECT' ? (others[0]?.username || group.name) : group.name,
    type: group.type,
    avatar: group.type === 'DIRECT' ? (others[0]?.avatar || null) : (group.imageUrl || null),
    description: group.description,
    lastActivityAt: group.lastActivityAt,
    members: group.members?.map(m => ({
        id: m.id,
        username: m.username,
        avatar: m.avatar
    })) || [],
    adminIds: group.admins?.map(a => a.id) || [],
    lastMessage: group.messages?.[0] ? MessageResponseDto(group.messages[0]) : null,
    unreadCount: group._count?.messages || 0,
    createdAt: group.createdAt,
  };
};

export const MessageResponseDto = (message) => ({
  id: message.id,
  content: message.content,
  mediaUrl: message.mediaUrl,
  type: message.type,
  isSystem: message.isSystem,
  createdAt: message.createdAt,
  sender: message.sender ? {
    id: message.sender.id,
    username: message.sender.username,
    avatar: message.sender.avatar,
  } : null,
  readBy: message.readBy || [],
});
