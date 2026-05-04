import express from "express";
import { auth } from "../middlewares/auth.js";
import discoverController from "../controllers/discoverController.js";

const router = express.Router();
router.use(auth);

router.get("/suggestions", discoverController.getSuggestions);
router.get("/trending", discoverController.getTrending);

export default router;
