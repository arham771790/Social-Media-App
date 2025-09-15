// app.js
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

// --- CORS (parse env correctly and trim) ---
const origins = ( process.env.CORS_ORIGINS|| "http://localhost:3000" )
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
// (Optional) preflight helper for some envs
// app.options("*", cors({ origin: origins, credentials: true }));

// --- JSON parsing (multer handles files) ---
app.use(express.json({ limit: "1mb" })); // raise if you need larger payloads

// --- Passport (OAuth) ---
app.use(passport.initialize());

// --- Routes (make sure your Axios baseURL is <API_URL>/api) ---
app.use("/api/auth", authRoutes);
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
// app.use("/api/rtc", rtcRoutes); // if added

// --- Swagger (safe load) ---
try {
  const swaggerDocument = YAML.load("./swagger.yaml");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.warn("Swagger not loaded (swagger.yaml missing?):", e.message);
}

// --- 404 fallback ---
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Error handler ---
app.use(errorHandler);

export default app;
