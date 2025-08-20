// src/routes/socialRoutes.js
import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  followUser,
  unfollowUser,
  acceptFollowRequest,
  declineFollowRequest,
  getFollowers,
  getFollowing,
  getContacts,
  addContact,
  createStory,
  getStories,
  getFollowRequests,
} from "../controllers/socialController.js";

const router = express.Router();
router.use(auth);

// follow / unfollow
router.post("/follow/:id", followUser);
router.delete("/follow/:id", unfollowUser);

// requests
router.get("/requests", getFollowRequests);                   // ?direction=incoming|outgoing
router.post("/requests/:followerId/accept", acceptFollowRequest);
router.post("/requests/:followerId/decline", declineFollowRequest);

// lists
router.get("/users/:id/followers", getFollowers);
router.get("/users/:id/following", getFollowing);

// contacts (optional)
router.get("/contacts", getContacts);
router.post("/contacts/:id", addContact);

// stories (optional)
router.post("/stories", createStory);
router.get("/stories/:id?", getStories);

export default router;
