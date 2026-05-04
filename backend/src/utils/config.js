import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  corsOrigins: process.env.CORS_ORIGINS || '',
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

if (!config.jwtSecret) {
  logger.error('CRITICAL: JWT_SECRET is not set in environment variables.');
}

/**
 * Normalizes and parses CORS origins from environment string.
 */
export const getAllowedOrigins = () => {
  const parseOrigins = (raw) =>
    (raw || "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
      .map((o) => o.replace(/\/+$/, ""));

  const origins = parseOrigins(config.corsOrigins);

  if (config.nodeEnv !== "production") {
    for (const dev of ["http://localhost:3000", "http://127.0.0.1:3000"]) {
      if (!origins.includes(dev)) origins.push(dev);
    }
  }
  return origins;
};

/**
 * Checks if a specific origin is allowed based on static list and wildcards.
 */
export const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  const cleaned = origin.replace(/\/+$/, "");
  
  const staticOrigins = allowedOrigins.filter((o) => !o.includes("*"));
  const wildcardToRegExp = (pattern) => {
    const escaped = pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&")
      .replace(/\\\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  };
  const wildcardOrigins = allowedOrigins
    .filter((o) => o.includes("*"))
    .map(wildcardToRegExp);

  return (
    staticOrigins.includes(cleaned) ||
    wildcardOrigins.some((re) => re.test(cleaned))
  );
};
