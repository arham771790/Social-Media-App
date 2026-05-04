import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRepository from '../repositories/AuthRepository.js';
import emailService from '../utils/emailService.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger.js';

class AuthService {
  async register(userData) {
    const { username, email, password } = userData;

    const existing = await authRepository.findByEmailOrUsername(email, username);
    if (existing) {
      throw new AppError('User already exists', StatusCodes.CONFLICT, ErrorCodes.USER_ALREADY_EXISTS);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await authRepository.createUser({
      username,
      email,
      password: hashedPassword,
    });

    emailService
      .sendWelcome(email, username)
      .catch((e) => logger.error('Welcome email failed', { error: e.message, email }));

    const token = this.generateToken(user.id);
    return { user, token };
  }

  async login(email, password) {
    const user = await authRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_UNAUTHORIZED);
    }

    if (!user.password && user.oauthProvider) {
      throw new AppError('Please login with your OAuth provider', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid credentials', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_UNAUTHORIZED);
    }

    const token = this.generateToken(user.id);
    return { user, token };
  }

  async forgotPassword(email) {
    const user = await authRepository.findByEmail(email);
    
    // Success response even if user not found to avoid enumeration
    if (!user) return;

    // Refuse re-issue if OTP was sent recently (e.g., within 2 minutes)
    if (user.resetTokenExpiry && user.resetTokenExpiry > new Date(Date.now() + 8 * 60 * 1000)) {
        throw new AppError('OTP already sent. Please wait before requesting another.', StatusCodes.TOO_MANY_REQUESTS, ErrorCodes.VALIDATION_ERROR);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await authRepository.updateUser(email, {
      resetToken: otp,
      resetTokenExpiry,
    });

    const emailResult = await emailService.sendOTP(email, otp);
    if (!emailResult.success) {
      throw new AppError('Failed to send OTP email', StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }
  }

  async resetPassword(email, otp, newPassword) {
    const user = await authRepository.findByEmail(email);
    
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new AppError('Invalid or expired OTP', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    if (new Date() > user.resetTokenExpiry) {
      throw new AppError('OTP has expired', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    if (user.resetToken !== otp) {
      throw new AppError('Invalid OTP', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await authRepository.updateUser(email, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    emailService
      .sendPasswordResetSuccess(email)
      .catch((e) => logger.error('Password reset success email failed', { error: e.message, email }));
  }

  generateToken(userId) {
    if (!process.env.JWT_SECRET) {
      throw new AppError('Server misconfigured: JWT_SECRET not set', StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  }
}

export default new AuthService();
