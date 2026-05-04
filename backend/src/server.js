import dotenv from "dotenv";
import app from "./app.js";
import { createServer } from "http";
import prisma from "./utils/db.js";
import logger from "./utils/logger.js";
import socketManager from "./sockets/socketManager.js";
import { config, getAllowedOrigins, isOriginAllowed } from "./utils/config.js";

dotenv.config();

const httpServer = createServer(app);

const allowedOriginsList = getAllowedOrigins();
const corsOptions = {
  origin: (origin, cb) => {
    if (isOriginAllowed(origin, allowedOriginsList)) return cb(null, true);
    logger.warn(`Socket.IO CORS blocked: ${origin}`);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

export const io = socketManager.init(httpServer, corsOptions);

// Export presence helpers from manager
export const isUserOnline = (userId) => socketManager.isUserOnline(userId);
export const userSocketMap = socketManager.userSocketMap;

/* -------------------------------------------------------
   Graceful Shutdown
-------------------------------------------------------- */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  httpServer.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Prisma disconnected.');
    process.exit(0);
  });

  // Force shutdown if it takes too long
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/* -------------------------------------------------------
   Start server
-------------------------------------------------------- */
httpServer.listen(config.port, () => {
  logger.info(`✅ Server running in ${config.nodeEnv} mode on port ${config.port}`);
});
