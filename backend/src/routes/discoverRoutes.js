import express from "express";
import { auth } from "../middlewares/auth.js";
import { getSuggestions, getTrending } from "../controllers/discoverController.js";

const router = express.Router();
router.use(auth);

router.get("/suggestions", getSuggestions);
router.get("/trending", getTrending);

export default router;
