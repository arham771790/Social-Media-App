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

  /* -------------------------------------------------------
    CORS configuration (normalized + wildcard support)
  -------------------------------------------------------- */
  const parseOrigins = (raw) =>
    (raw || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => o.replace(/\/+$/, "")); // strip trailing slash(es)

  const allowedOriginsList = parseOrigins(process.env.CORS_ORIGINS || "");

  // In non-production, also allow local Next.js dev servers
  if (process.env.NODE_ENV !== "production") {
    for (const dev of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      if (!allowedOriginsList.includes(dev)) allowedOriginsList.push(dev);
    }
  }

  const wildcardToRegExp = (pattern) => {
    const escaped = pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&")
      .replace(/\\\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  };

  const wildcardOrigins = allowedOriginsList
    .filter((o) => o.includes("*"))
    .map(wildcardToRegExp);

  const staticOrigins = allowedOriginsList.filter((o) => !o.includes("*"));

  const isOriginAllowed = (origin) => {
    if (!origin) return true; // Postman / server-to-server / health checks
    const cleaned = origin.replace(/\/+$/, "");
    return (
      staticOrigins.includes(cleaned) ||
      wildcardOrigins.some((re) => re.test(cleaned))
    );
  };

  const corsOptions = {
    origin(origin, callback) {
      if (isOriginAllowed(origin)) return callback(null, true);
      console.warn(`CORS blocked: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600, // cache preflight for 10 minutes
  };

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  /* -------------------------------------------------------
    Express setup
  -------------------------------------------------------- */
  app.use(express.json({ limit: "1mb" }));
  app.use(passport.initialize());

  /* -------------------------------------------------------
    Routes
  -------------------------------------------------------- */
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

  /* -------------------------------------------------------
    Swagger (optional)
  -------------------------------------------------------- */
  try {
    const swaggerDocument = YAML.load("./swagger.yaml");
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (err) {
    console.warn("⚠️ Swagger not loaded:", err.message);
  }

  /* -------------------------------------------------------
    Error handling
  -------------------------------------------------------- */
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  export default app;
