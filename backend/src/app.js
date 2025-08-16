// app.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from './utils/oauthConfig.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
// optional: RTC routes if you add utils/ice.js
// import rtcRoutes from './routes/rtcRoutes.js';

import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// your error handler
import { errorHandler } from './middlewares/error.js';

dotenv.config();

const app = express();

// --- CORS (from env, comma-separated) ---
const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({ origin: origins, credentials: true }));

// --- JSON parsing (cap size; multer handles files) ---
app.use(express.json({ limit: '1mb' }));

// --- Passport (OAuth) ---
app.use(passport.initialize());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api',feedRoutes);
app.use('/api', commentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/health', healthRoutes);
// app.use('/api/rtc', rtcRoutes); // if added

// --- Swagger (safe load) ---
try {
  const swaggerDocument = YAML.load('./swagger.yaml');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.warn('Swagger not loaded (swagger.yaml missing?):', e.message);
}

// --- 404 fallback (optional) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Error handler ---
app.use(errorHandler);

export default app;
