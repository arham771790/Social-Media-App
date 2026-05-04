import express from "express";
import cors from "cors";
import passport from "./utils/oauthConfig.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { StatusCodes } from "http-status-codes";

import { config, getAllowedOrigins, isOriginAllowed } from "./utils/config.js";
import { requestTracingMiddleware, requestLogger } from "./middlewares/requestLogger.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { AppError, ErrorCodes } from "./errors/AppError.js";
import logger from "./utils/logger.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import discoverRoutes from "./routes/discoverRoutes.js";
import exploreRoutes from "./routes/exploreRoutes.js";
import verifyRoutes from "./routes/verifyRoutes.js";

const app = express();

app.use(helmet());

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // increased for dev
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Auth Rate Limiting (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // increased for dev
  message: "Too many login/register attempts, please try again after an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});


app.use(requestTracingMiddleware);
app.use(requestLogger);

const allowedOriginsList = getAllowedOrigins();

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin, allowedOriginsList)) return callback(null, true);
    logger.warn(`CORS blocked: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600, // cache preflight for 10 minutes
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(passport.initialize());

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", feedRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", commentRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/explore", exploreRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/auth", verifyRoutes);

try {
  const swaggerDocument = YAML.load("./swagger.yaml");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  logger.warn("⚠️ Swagger not loaded:", { error: err.message });
}

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, StatusCodes.NOT_FOUND, ErrorCodes.NOT_FOUND));
});

app.use(errorHandler);

export default app;
