import authService from '../services/AuthService.js';
import verifyService from '../services/VerifyService.js';
import { StatusCodes } from 'http-status-codes';
import { 
  RegisterRequestSchema, 
  LoginRequestSchema, 
  ForgotPasswordRequestSchema, 
  ResetPasswordRequestSchema,
  AuthResponseDto 
} from '../dtos/AuthDto.js';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import logger from '../utils/logger.js';
import emailService from '../utils/emailService.js';
import { config } from '../utils/config.js';
import catchAsync from '../utils/catchAsync.js';

class AuthController {
  register = catchAsync(async (req, res, next) => {
    const parsed = RegisterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    let result;
    if (parsed.data.verifyToken) {
      const user = await verifyService.registerVerified(parsed.data);
      const token = authService.generateToken(user.id);
      result = { user, token };
    } else {
      result = await authService.register(parsed.data);
    }

    res.status(StatusCodes.CREATED).json(AuthResponseDto(result.user, result.token));
  });

  login = catchAsync(async (req, res, next) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const { user, token } = await authService.login(parsed.data.email, parsed.data.password);
    res.status(StatusCodes.OK).json(AuthResponseDto(user, token));
  });

  forgotPassword = catchAsync(async (req, res, next) => {
    const parsed = ForgotPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    await authService.forgotPassword(parsed.data.email);
    
    res.status(StatusCodes.OK).json({
      message: 'If an account with this email exists, you will receive an OTP',
    });
  });

  resetPassword = catchAsync(async (req, res, next) => {
    const parsed = ResetPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }

    const { email, otp, newPassword } = parsed.data;
    await authService.resetPassword(email, otp, newPassword);

    res.status(StatusCodes.OK).json({ message: 'Password reset successful' });
  });

  oauthCallback = catchAsync(async (req, res, next) => {
    const { user } = req;
    if (!user) {
      throw new AppError('OAuth authentication failed', StatusCodes.UNAUTHORIZED, ErrorCodes.AUTH_UNAUTHORIZED);
    }
    
    const token = authService.generateToken(user.id);

    const redirectUrl = `${config.frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      })
    )}`;

    res.redirect(redirectUrl);
  });

  logout = (req, res) => {
    res.status(StatusCodes.OK).json({ 
      message: 'Logged out. Please delete your token on client.' 
    });
  };

  testEmail = catchAsync(async (req, res, next) => {
    const { email } = req.body || {};
    if (!email) {
      throw new AppError('Email is required', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    const emailResult = await emailService.sendOTP(email, '123456');
    if (!emailResult.success) {
      throw new AppError('Failed to send test email', StatusCodes.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }
    res.status(StatusCodes.OK).json({ 
      message: 'Test email sent successfully', 
      messageId: emailResult.messageId 
    });
  });

  testOAuth = (req, res) => {
    const oauthConfig = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Missing',
        callbackUrl: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      },
      frontend: {
        url: config.frontendUrl || 'Not configured',
      },
      backend: {
        url: process.env.BACKEND_URL || 'Not configured',
      },
    };
    res.status(StatusCodes.OK).json({
      message: 'OAuth Configuration Status',
      config: oauthConfig,
      timestamp: new Date().toISOString(),
    });
  };
}

export default new AuthController();
