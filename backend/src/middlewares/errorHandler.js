import logger from '../utils/logger.js';
import * as rtracer from 'cls-rtracer';
import { StatusCodes } from 'http-status-codes';
import { AppError, ErrorCodes } from '../errors/AppError.js';

export const errorHandler = (err, req, res, next) => {
  const requestId = rtracer.id();
  
  // Standardize error
  let error = { ...err };
  error.message = err.message;
  
  if (!(err instanceof AppError)) {
    // Wrap unknown errors
    error = new AppError(
      err.message || 'Internal Server Error',
      err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      err.code || ErrorCodes.INTERNAL_ERROR,
      false
    );
  }

  // Log error
  logger.error(error.message, {
    requestId,
    stack: err.stack,
    code: error.code,
    statusCode: error.statusCode,
    path: req.path,
  });

  // Send response
  res.status(error.statusCode).json({
    status: error.status,
    code: error.code,
    message: error.message,
    requestId,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
