// src/routes/socialRoutes.js
import express from "express";
import { auth } from "../middlewares/auth.js";
import socialController from "../controllers/socialController.js";

const router = express.Router();
// stories (public)
router.get("/stories", socialController.getStories);

router.use(auth);

// follow / unfollow
router.post("/users/:id/follow", socialController.followUser);
router.delete("/users/:id/unfollow", socialController.unfollowUser);

// requests
router.get("/requests", socialController.getFollowRequests);
router.post("/requests/:followerId/accept", socialController.acceptFollowRequest);
router.post("/requests/:followerId/decline", socialController.declineFollowRequest);

// lists
router.get("/users/:id/followers", socialController.getFollowers);
router.get("/users/:id/following", socialController.getFollowing);

// contacts
router.get("/contacts", socialController.getContacts);
router.post("/contacts/:id", socialController.addContact);

// stories (actions & specific user)
router.post("/stories", socialController.createStory);
router.get("/stories/:id", socialController.getStories);
router.delete("/stories/:storyId", socialController.deleteStory);

export default router;
