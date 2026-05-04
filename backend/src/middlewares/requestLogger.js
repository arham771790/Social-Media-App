import * as rtracer from 'cls-rtracer';
import logger from '../utils/logger.js';

export const requestTracingMiddleware = rtracer.expressMiddleware({
  useHeader: true,
  headerName: 'X-Request-Id',
});

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    logger.info(`${method} ${originalUrl} ${statusCode} - ${duration}ms`, {
      method,
      url: originalUrl,
      status: statusCode,
      duration,
      ip,
    });
  });
  
  next();
};
