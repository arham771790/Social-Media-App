import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "./utils/oauthConfig.js";

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
// import rtcRoutes from "./routes/rtcRoutes.js"; // optional

import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { errorHandler } from "./middlewares/error.js";

dotenv.config();

const app = express();

/* ------------------------------------------------------------------
   ✅ CORS CONFIGURATION
   ------------------------------------------------------------------ */

// Read and sanitize environment variable
const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

// CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow no-origin requests (like Postman or health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Use CORS with options
app.use(cors(corsOptions));

// Handle preflight (OPTIONS) requests properly
app.options("*", cors(corsOptions));

/* ------------------------------------------------------------------
   ✅ EXPRESS SETUP
   ------------------------------------------------------------------ */
app.use(express.json({ limit: "1mb" }));
app.use(passport.initialize());

/* ------------------------------------------------------------------
   ✅ ROUTES
   ------------------------------------------------------------------ */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api", feedRoutes);
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
// app.use("/api/rtc", rtcRoutes);

/* ------------------------------------------------------------------
   ✅ SWAGGER SETUP (optional)
   ------------------------------------------------------------------ */
try {
  const swaggerDocument = YAML.load("./swagger.yaml");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.warn("⚠️ Swagger not loaded:", err.message);
}

/* ------------------------------------------------------------------
   ✅ ERROR HANDLING
   ------------------------------------------------------------------ */
app.use((req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;
