import { StatusCodes } from "http-status-codes";
import prisma from "../utils/db.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import emailService from "../utils/emailService.js";
import bcrypt from "bcryptjs";

// ---- config ----
const OTP_TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);
const VERIFY_JWT_TTL_MIN = Number(process.env.VERIFY_JWT_TTL_MIN || 15);
const OTP_SECRET = process.env.OTP_SECRET || "change-me-long-random";

// helpers
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const randomCode = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
const hashCode = (email, code) =>
  crypto.createHmac("sha256", OTP_SECRET).update(`${email}:${code}`).digest("hex");

// POST /api/auth/verify/request { email }
// POST /api/auth/verify/request { email }
export async function requestVerification(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Valid email required" });
    }

    // 🔑 Check if already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(StatusCodes.CONFLICT).json({ error: "Email already registered" });
    }

    // prevent spamming codes: keep at most 3 active
    const activeCount = await prisma.emailVerification.count({
      where: { email, consumed: false, expiresAt: { gt: new Date() } },
    });
    if (activeCount >= 3) {
      return res
        .status(StatusCodes.TOO_MANY_REQUESTS)
        .json({ error: "Too many codes requested. Try later." });
    }

    const code = randomCode();
    const codeHash = hashCode(email, code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    await prisma.emailVerification.create({
      data: { email, codeHash, expiresAt },
    });

    const sent = await emailService.sendEmailVerificationCode(email, code, OTP_TTL_MIN);
    if (!sent.success) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to send verification email" });
    }

    if (process.env.NODE_ENV !== "production" || process.env.DEBUG_EMAIL) {
      console.log(`[DEV] Email verify code for ${email}: ${code}`);
    }

    return res.status(StatusCodes.OK).json({ ok: true, ttlMin: OTP_TTL_MIN });
  } catch (e) {
    console.error("requestVerification error", e);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to request verification" });
  }
}


// POST /api/auth/verify/confirm { email, code }
export async function confirmVerification(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();

    if (!email || !code) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Email and code required" });
    }

    const entry = await prisma.emailVerification.findFirst({
      where: { email, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!entry) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "No active code or code expired" });
    }

    const matches = entry.codeHash === hashCode(email, code);
    if (!matches) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid code" });
    }

    await prisma.emailVerification.update({
      where: { id: entry.id },
      data: { consumed: true },
    });

    const verifyToken = jwt.sign(
      { sub: email, email, scope: "email_verification" },
      OTP_SECRET,
      { expiresIn: `${VERIFY_JWT_TTL_MIN}m` }
    );

    return res.status(StatusCodes.OK).json({ ok: true, verifyToken, ttlMin: VERIFY_JWT_TTL_MIN });
  } catch (e) {
    console.error("confirmVerification error", e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to confirm verification" });
  }
}

// POST /api/auth/register-verified { username, email, password, verifyToken }
export async function registerWithVerifiedEmail(req, res) {
  try {
    const { username, email: rawEmail, password, verifyToken } = req.body || {};
    const email = normalizeEmail(rawEmail);

    if (!username || !email || !password || !verifyToken) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "All fields and verify token are required" });
    }

    // validate token
    let payload;
    try {
      payload = jwt.verify(verifyToken, OTP_SECRET);
      if (payload.scope !== "email_verification" || normalizeEmail(payload.email) !== email) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid verify token" });
      }
    } catch {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Verify token expired or invalid" });
    }

    // prevent duplicates
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(StatusCodes.CONFLICT).json({ error: "Email already in use" });
    }

    const usernameTaken = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
    });
    if (usernameTaken) {
      return res.status(StatusCodes.CONFLICT).json({ error: "Username already taken" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: passwordHash,
        isPublic: true,
      },
      select: { id: true, email: true, username: true, avatar: true },
    });

    // optional: send welcome email (non-blocking)
    emailService.sendWelcome(user.email, user.username).catch(() => {});

    // If you want to auto-login, issue your auth JWT here.
    // For safety (and minimal coupling), we just return the user; client can redirect to Login.
    return res.status(StatusCodes.CREATED).json({ user });
  } catch (e) {
    console.error("registerWithVerifiedEmail error", e);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Registration failed" });
  }
}
