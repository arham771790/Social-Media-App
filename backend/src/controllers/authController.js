// controllers/authController.js
import prisma from "../utils/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import emailService from "../utils/emailService.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(6),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const signJwt = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ─── Register ─────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });
    }
    const { username, email, password } = result.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res
        .status(StatusCodes.CONFLICT)
        .json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
    });

    // fire-and-forget welcome email (do not block response)
    emailService
      .sendWelcome(email, username)
      .catch((e) => console.error("Welcome email failed:", e));

    const token = signJwt(user.id);
    res.status(StatusCodes.CREATED).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Register error:", err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Register failed" });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Invalid credentials" });

    // OAuth-only account?
    if (!user.password && user.oauthProvider) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Please login with your OAuth provider",
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "Invalid credentials" });

    const token = signJwt(user.id);
    res.status(StatusCodes.OK).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Login failed" });
  }
};

// ─── Forgot Password (OTP) ────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });

    const { email } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond success-ish to avoid user enumeration
    if (!user) {
      return res.status(StatusCodes.OK).json({
        message:
          "If an account with this email exists, you will receive an OTP",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { email },
      data: { resetToken: otp, resetTokenExpiry },
    });

    const emailResult = await emailService.sendOTP(email, otp);
    if (!emailResult.success) {
      return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to send OTP email" });
    }
    if (user.resetTokenExpiry && user.resetTokenExpiry > new Date(Date.now() + 2 * 60 * 1000)) {
      // within 8 mins left → refuse re-issue
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: "OTP already sent. Please wait before requesting another." });
    }
    res.status(StatusCodes.OK).json({
      message:
        "If an account with this email exists, you will receive an OTP",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Forgot password failed" });
  }
};

// ─── Reset Password (OTP) ─────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: result.error });

    const { email, otp, newPassword } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Invalid or expired OTP" });
    }

    if (new Date() > user.resetTokenExpiry) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "OTP has expired" });
    }

    if (user.resetToken !== otp) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    emailService
      .sendPasswordResetSuccess(email)
      .catch((e) => console.error("Password reset success email failed:", e));

    res.status(StatusCodes.OK).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Reset password failed" });
  }
};

// ─── OAuth callback (if using passport callbacks directly) ────────────────────
export const oauthCallback = async (req, res) => {
  try {
    const { user } = req;
    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ error: "OAuth authentication failed" });
    }
    const token = signJwt(user.id);

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(
      JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      })
    )}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
};

// ─── Logout (stateless) ───────────────────────────────────────────────────────
export const logout = async (_req, res) => {
  res
    .status(StatusCodes.OK)
    .json({ message: "Logged out. Please delete your token on client." });
};

// ─── Test email / OAuth configs ───────────────────────────────────────────────
export const testEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Email is required" });
    }
    const emailResult = await emailService.sendOTP(email, "123456");
    if (!emailResult.success) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "Failed to send test email",
        details: emailResult.error,
      });
    }
    res
      .status(StatusCodes.OK)
      .json({ message: "Test email sent successfully", messageId: emailResult.messageId });
  } catch (error) {
    console.error("Test email error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Test email failed" });
  }
};

export const testOAuth = async (_req, res) => {
  try {
    const oauthConfig = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ? "Configured" : "Missing",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ? "Configured" : "Missing",
        callbackUrl: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      },
      frontend: {
        url: process.env.FRONTEND_URL || "Not configured",
        apiUrl: process.env.NEXT_PUBLIC_API_URL || "Not configured",
      },
      backend: {
        url: process.env.BACKEND_URL || "Not configured",
      },
    };
    res.status(StatusCodes.OK).json({
      message: "OAuth Configuration Status",
      config: oauthConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test OAuth error:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Test OAuth failed" });
  }
};
