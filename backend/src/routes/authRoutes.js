// routes/authRoutes.js
import { Router } from "express";
import passport from "../utils/oauthConfig.js";
import jwt from "jsonwebtoken";
import {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  oauthCallback, // not used directly below (passport handlers inline), but exported if you prefer
  testEmail,
  testOAuth,
} from "../controllers/authController.js";
import { requestVerification,confirmVerification,registerWithVerifiedEmail } from "../controllers/verifyController.js";
const router = Router();

// Basic auth
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Password reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Diagnostics
router.post("/test-email", testEmail);
router.get("/test-oauth", testOAuth);

// --- Email verification (no auth) ---;
// public endpoints (no auth needed)
router.post("/verify-email/request", requestVerification);
router.post("/verify-email/confirm", confirmVerification);
router.post("/register-verified", registerWithVerifiedEmail);

// OAuth: Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/error`,
    session: false,
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      }
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
      const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      const userData = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
      };
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

// OAuth: GitHub (if enabled)
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/error`,
    session: false,
  }),
  (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
      }
      if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
      const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
      const userData = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
      };
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${encodeURIComponent(
        JSON.stringify(userData)
      )}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("GitHub OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  }
);

export default router;
