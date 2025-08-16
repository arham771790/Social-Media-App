// routes/aiRoutes.js
import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  generateTags,
  suggestCaptions,
  suggestMediaAwareCaptions,   
  titleFromContent,            
} from "../controllers/aiController.js";

const router = express.Router();

router.use(auth);

router.post("/generate-tags", generateTags);
router.post("/suggest-captions", suggestCaptions);
router.post("/captions/media", suggestMediaAwareCaptions); 
router.post("/title-from-content", titleFromContent);      

export default router;
