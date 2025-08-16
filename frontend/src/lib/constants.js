// App constants and configuration

export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  FEED: '/feed',
  MESSAGES: '/messages',
  NOTIFICATIONS: '/notifications',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  CREATE: '/create'
}

export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
  AUTH_RESET_PASSWORD: '/api/auth/reset-password',
  
  // User
  USER_ME: '/api/user/me',
  USER_SETTINGS: '/api/user/me/settings',
  USER_BY_ID: (id) => `/api/user/${id}`,
  USER_SEARCH: '/api/user/search',
  
  // Posts
  POSTS: '/api/posts',
  POST_BY_ID: (id) => `/api/posts/${id}`,
  POST_LIKE: (id) => `/api/posts/${id}/like`,
  POST_BOOKMARK: (id) => `/api/posts/${id}/bookmark`,
  POST_REPLY: (id) => `/api/posts/${id}/reply`,
  
  // Comments
  POST_COMMENTS: (postId) => `/api/comments/posts/${postId}/comments`,
  DELETE_COMMENT: (id) => `/api/comments/comments/${id}`,
  
  // Messages
  MESSAGE_THREADS: '/api/messages/threads',
  MESSAGE_USERS: '/api/messages/users',
  MESSAGE_DIRECT: '/api/messages/direct',
  MESSAGE_GROUP: '/api/messages/group',
  CHAT_MESSAGES: (chatId) => `/api/messages/${chatId}`,
  MARK_READ: (chatId) => `/api/messages/${chatId}/read`,
  
  // Notifications
  NOTIFICATIONS: '/api/notifications',
  
  // Uploads
  UPLOAD_FILE: '/api/upload/file',
  UPLOAD_FILES: '/api/upload/files',
  UPLOAD_PROFILE_PICTURE: '/api/upload/profile-picture',
  UPLOAD_STORY: '/api/upload/story',
  
  // Health
  HEALTH: '/api/health'
}

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Rooms
  JOIN: 'join',
  LEAVE: 'leave',
  
  // Messages
  MESSAGE_NEW: 'message:new',
  
  // Typing
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  
  // Notifications
  NOTIFICATION_NEW: 'notification:new'
}

export const FILE_CONSTRAINTS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_VIDEO_SIZE: 100 * 1024 * 1024, // 100MB
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ACCEPTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov', 'video/avi']
}

export const UI_CONFIG = {
  TOAST_DURATION: 3000,
  SKELETON_COUNT: 6,
  POSTS_PER_PAGE: 10,
  MESSAGES_PER_PAGE: 50,
  NOTIFICATIONS_PER_PAGE: 20
}