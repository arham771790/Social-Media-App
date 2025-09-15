import { Router } from "express";
import { requestVerification, confirmVerification, registerWithVerifiedEmail } from "../controllers/verifyController.js";

const router = Router();

// public endpoints (no auth needed)
router.post("/verify/request", requestVerification);
router.post("/verify/confirm", confirmVerification);
router.post("/register-verified", registerWithVerifiedEmail);

export default router;
