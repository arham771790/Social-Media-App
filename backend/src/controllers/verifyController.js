import verifyService from '../services/VerifyService.js';
import authService from '../services/AuthService.js';
import { StatusCodes } from 'http-status-codes';
import { AppError, ErrorCodes } from '../errors/AppError.js';
import catchAsync from '../utils/catchAsync.js';

class VerifyController {
  requestVerification = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new AppError('Valid email required', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    const result = await verifyService.requestVerification(email);
    res.status(StatusCodes.OK).json({ ok: true, ...result });
  });

  confirmVerification = catchAsync(async (req, res, next) => {
    const { email, code } = req.body;
    if (!email || !code) {
      throw new AppError('Email and code required', StatusCodes.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR);
    }
    const result = await verifyService.confirmVerification(email, code);
    res.status(StatusCodes.OK).json({ ok: true, ...result });
  });

  registerWithVerifiedEmail = catchAsync(async (req, res, next) => {
    const user = await verifyService.registerVerified(req.body);
    const token = authService.generateToken(user);
    res.status(StatusCodes.CREATED).json({ user, token });
  });
}

export default new VerifyController();
