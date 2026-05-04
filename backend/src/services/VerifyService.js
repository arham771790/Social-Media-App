import prisma from '../utils/db.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import emailService from '../utils/emailService.js';
import bcrypt from 'bcryptjs';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger.js';

const OTP_TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);
const VERIFY_JWT_TTL_MIN = Number(process.env.VERIFY_JWT_TTL_MIN || 15);
const OTP_SECRET = process.env.OTP_SECRET || 'change-me-long-random';

class VerifyService {
  async requestVerification(email) {
    const normalized = email.trim().toLowerCase();
    
    const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (existingUser) {
      throw new AppError('Email already registered', StatusCodes.CONFLICT, ErrorCodes.USER_ALREADY_EXISTS);
    }

    const activeCount = await prisma.emailVerification.count({
      where: { email: normalized, consumed: false, expiresAt: { gt: new Date() } },
    });
    if (activeCount >= 3) {
       throw new AppError('Too many codes requested. Try later.', StatusCodes.TOO_MANY_REQUESTS, ErrorCodes.RATE_LIMIT_EXCEEDED);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHmac('sha256', OTP_SECRET).update(`${normalized}:${code}`).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email: normalized, codeHash, expiresAt },
    });

    const sent = await emailService.sendEmailVerificationCode(normalized, code, OTP_TTL_MIN);
    if (!sent.success) {
       throw new AppError('Failed to send verification email', StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }

    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_EMAIL) {
       logger.info(`[DEV] Email verify code for ${normalized}: ${code}`);
    }

    return { ttlMin: OTP_TTL_MIN };
  }

  async confirmVerification(email, code) {
    const normalized = email.trim().toLowerCase();
    const entry = await prisma.emailVerification.findFirst({
      where: { email: normalized, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    
    if (!entry) {
        throw new AppError('No active code or code expired', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const m = crypto.createHmac('sha256', OTP_SECRET).update(`${normalized}:${code}`).digest('hex');
    if (entry.codeHash !== m) {
        throw new AppError('Invalid code', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_INVALID_CREDENTIALS);
    }

    await prisma.emailVerification.update({
      where: { id: entry.id },
      data: { consumed: true },
    });

    const verifyToken = jwt.sign(
      { sub: normalized, email: normalized, scope: 'email_verification' },
      OTP_SECRET,
      { expiresIn: `${VERIFY_JWT_TTL_MIN}m` }
    );

    return { verifyToken, ttlMin: VERIFY_JWT_TTL_MIN };
  }

  async registerVerified(data) {
    const { username, email: rawEmail, password, verifyToken } = data;
    const email = rawEmail.trim().toLowerCase();

    try {
      const payload = jwt.verify(verifyToken, OTP_SECRET);
      if (payload.scope !== 'email_verification' || payload.email.toLowerCase() !== email) {
        throw new AppError('Invalid verify token', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_INVALID_TOKEN);
      }
    } catch (e) {
       throw new AppError('Verify token expired or invalid', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_INVALID_TOKEN);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', StatusCodes.CONFLICT, ErrorCodes.USER_ALREADY_EXISTS);

    const usernameTaken = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (usernameTaken) throw new AppError('Username already taken', StatusCodes.CONFLICT, ErrorCodes.VALIDATION_ERROR);

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, username, password: passwordHash, isPublic: true },
      select: { id: true, email: true, username: true, avatar: true },
    });

    emailService.sendWelcome(user.email, user.username).catch(() => {});
    return user;
  }
}

export default new VerifyService();
