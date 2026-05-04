// routes/aiRoutes.js
import express from "express";
import { auth } from "../middlewares/auth.js";
import aiController from "../controllers/aiController.js";

const router = express.Router();

router.use(auth);

router.post("/generate-tags", aiController.generateTags);
router.post("/suggest-captions", aiController.suggestCaptions);
router.post("/captions/media", aiController.suggestMediaAwareCaptions); 
router.post("/title-from-content", aiController.titleFromContent);      

export default router;
