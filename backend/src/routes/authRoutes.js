// routes/authRoutes.js
import { Router } from "express";
import passport from "../utils/oauthConfig.js";
import authController from "../controllers/authController.js";
import verifyController from "../controllers/verifyController.js";
import { config } from "../utils/config.js";

const router = Router();

// Basic auth
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Password reset
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Diagnostics
router.post("/test-email", authController.testEmail);
router.get("/test-oauth", authController.testOAuth);

// Email verification
router.post("/verify-email/request", verifyController.requestVerification);
router.post("/verify-email/confirm", verifyController.confirmVerification);
router.post("/register-verified", verifyController.registerWithVerifiedEmail);

// OAuth: Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${config.frontendUrl}/auth/error`,
    session: false,
  }),
  authController.oauthCallback
);

// OAuth: GitHub
router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${config.frontendUrl}/auth/error`,
    session: false,
  }),
  authController.oauthCallback
);

export default router;
