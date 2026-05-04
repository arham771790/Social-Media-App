import fs from 'fs';
import path from 'path';
import prisma from '../utils/db.js';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../utils/catchAsync.js';

const pkgPath = path.resolve('package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

class HealthController {
  health = catchAsync(async (req, res, next) => {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    res.status(StatusCodes.OK).json({
      status: "ok",
      db: "up",
      version: pkg.version || "unknown",
      uptimeSeconds: Math.floor(process.uptime()),
      responseMs: Date.now() - start
    });
  });
}

export default new HealthController();
