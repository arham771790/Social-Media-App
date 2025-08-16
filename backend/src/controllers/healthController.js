// controllers/healthController.js
import fs from 'fs';
import path from 'path';
import prisma from "../utils/db.js";

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

export const health = async (req, res) => {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      db: "up",
      version: pkg.version || "unknown",
      uptimeSeconds: Math.floor(process.uptime()),
      responseMs: Date.now() - start
    });
  } catch (err) {
    res.status(500).json({ status: "error", db: "down", error: err.message });
  }
};
