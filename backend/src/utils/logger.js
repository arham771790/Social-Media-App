import winston from 'winston';
import 'winston-daily-rotate-file';
import * as rtracer from 'cls-rtracer';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const requestId = rtracer.id();
  const reqIdStr = requestId ? ` [${requestId}]` : '';
  let msg = `${timestamp} ${level}${reqIdStr}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? json() : devFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        process.env.NODE_ENV === 'production' ? json() : devFormat
      ),
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info',
    }),
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
    }),
  ],
});

export default logger;
