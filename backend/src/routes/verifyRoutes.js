import { Router } from "express";
import verifyController from "../controllers/verifyController.js";

const router = Router();

// public endpoints
router.post("/verify/request", verifyController.requestVerification);
router.post("/verify/confirm", verifyController.confirmVerification);
router.post("/register-verified", verifyController.registerWithVerifiedEmail);

export default router;
