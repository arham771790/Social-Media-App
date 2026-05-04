import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

export const ErrorCodes = {
  // Auth
  AUTH_UNAUTHORIZED: 'AUTH_001',
  AUTH_FORBIDDEN: 'AUTH_002',
  AUTH_TOKEN_EXPIRED: 'AUTH_003',
  AUTH_INVALID_TOKEN: 'AUTH_004',
  AUTH_INVALID_CREDENTIALS: 'AUTH_005',
  
  // User
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  
  // Content
  POST_NOT_FOUND: 'POST_001',
  COMMENT_NOT_FOUND: 'COMM_001',
  TAG_NOT_FOUND: 'TAG_001',
  
  // Social/Interaction
  SOCIAL_NOT_FOUND: 'SOC_001',
  MESSAGE_NOT_FOUND: 'MSG_001',
  
  // System
  INTERNAL_ERROR: 'SYS_001',
  VALIDATION_ERROR: 'SYS_002',
  NOT_FOUND: 'SYS_003',
  RATE_LIMIT_EXCEEDED: 'SYS_004',
};
