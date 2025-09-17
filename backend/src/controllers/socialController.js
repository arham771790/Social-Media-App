// src/controllers/socialController.js
import prisma from "../utils/db.js";
import { StatusCodes } from "http-status-codes";
import { createAndEmitNotification } from "./notificationController.js";
/* ------------ helper: can the viewer see private content? ------------ */
async function canViewPrivateContent(targetUserId, viewerId) {
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;

  const rel = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
    select: { status: true },
  });
  return rel?.status === "ACCEPTED";
}

/* --------------------------------
   FOLLOW / UNFOLLOW (with private requests)
----------------------------------- */

export const followUser = async (req, res) => {
  try {
    const followerId = req.userId;
    const followingId = req.params.id;

    if (!followerId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
    }
    if (followerId === followingId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "You cannot follow yourself." });
    }

    const target = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isPublic: true },
    });
    if (!target) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found." });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { status: true },
    });
    if (existing) {
      return res.status(StatusCodes.OK).json({
        status: existing.status,
        isFollowing: existing.status === "ACCEPTED",
        isPending: existing.status === "PENDING",
      });
    }

    const status = target.isPublic ? "ACCEPTED" : "PENDING";

    await prisma.follow.create({
      data: { followerId, followingId, status },
    });

    if (status === "PENDING") {
      await createAndEmitNotification({
        recipientId: followingId,
        type: "FOLLOW_REQUEST",
        message: "wants to follow you",
        relatedUserId: followerId,
      });
    } else {
      await createAndEmitNotification({
        recipientId: followingId,
        type: "FOLLOW",
        message: "started following you",
        relatedUserId: followerId,
      });
    }

    return res.status(StatusCodes.OK).json({
      status,
      isFollowing: status === "ACCEPTED",
      isPending: status === "PENDING",
    });
  } catch (err) {
    console.error("followUser error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to follow user." });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const followerId = req.userId;
    const followingId = req.params.id;

    if (!followerId) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Unauthorized" });
    }
    if (followerId === followingId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid target." });
    }

    await prisma.follow.deleteMany({ where: { followerId, followingId } });
    return res.status(StatusCodes.OK).json({ ok: true });
  } catch (err) {
    console.error("unfollowUser error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to unfollow user." });
  }
};

export const acceptFollowRequest = async (req, res) => {
  try {
    const followingId = req.userId; // the private account owner
    const { followerId } = req.params;

    const reqRow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!reqRow) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }
    if (reqRow.status !== "PENDING") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Request is not pending" });
    }

    await prisma.follow.update({
      where: { followerId_followingId: { followerId, followingId } },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await createAndEmitNotification({
      recipientId: followerId,
      type: "FOLLOW_ACCEPTED",
      message: "accepted your follow request",
      relatedUserId: followingId,
    });
    await prisma.notification.updateMany({
  where: {
    recipientId: followingId,        // the account that received the request
    type: "FOLLOW_REQUEST",
    relatedUserId: followerId,       // who sent the request
    read: false,
  },
  data: { read: true },
});


    return res.status(StatusCodes.OK).json({ ok: true });
  } catch (err) {
    console.error("acceptFollowRequest error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to accept request." });
  }
};

export const declineFollowRequest = async (req, res) => {
  try {
    const followingId = req.userId; // the private account owner
    const { followerId } = req.params;

    const reqRow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (!reqRow) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Request not found" });
    }
    if (reqRow.status !== "PENDING") {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Request is not pending" });
    }

    await prisma.follow.update({
      where: { followerId_followingId: { followerId, followingId } },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    await prisma.notification.updateMany({
  where: {
    recipientId: followingId,
    type: "FOLLOW_REQUEST",
    relatedUserId: followerId,
    read: false,
  },
  data: { read: true },
});
    return res.status(StatusCodes.OK).json({ ok: true });
  } catch (err) {
    console.error("declineFollowRequest error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to decline request." });
  }
};

/* --------------------------------
   FOLLOWERS / FOLLOWING lists
   Visible to: self OR public account OR accepted follower
----------------------------------- */

export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.userId || null;
    const isSelf = viewerId === id;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true },
    });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found." });
    }

    const allowed = user.isPublic || isSelf || (await canViewPrivateContent(id, viewerId));
    if (!allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "This account is private." });
    }

    const rows = await prisma.follow.findMany({
      where: { followingId: id, status: "ACCEPTED" },
      skip,
      take: limit,
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const followers = rows.map((f) => ({
      ...f.follower,
      isOnline: !!f.follower.settings?.showActivityStatus,
      lastSeen: f.follower.settings?.privacyLastSeen ? new Date() : null,
      followedAt: f.createdAt,
    }));

    const total = await prisma.follow.count({
      where: { followingId: id, status: "ACCEPTED" },
    });

    return res
      .status(StatusCodes.OK)
      .json({ followers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch followers." });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const viewerId = req.userId || null;
    const isSelf = viewerId === id;

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true },
    });
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found." });
    }

    const allowed = user.isPublic || isSelf || (await canViewPrivateContent(id, viewerId));
    if (!allowed) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "This account is private." });
    }

    const rows = await prisma.follow.findMany({
      where: { followerId: id, status: "ACCEPTED" },
      skip,
      take: limit,
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const following = rows.map((f) => ({
      ...f.following,
      isOnline: !!f.following.settings?.showActivityStatus,
      lastSeen: f.following.settings?.privacyLastSeen ? new Date() : null,
      followedAt: f.createdAt,
    }));

    const total = await prisma.follow.count({
      where: { followerId: id, status: "ACCEPTED" },
    });

    return res
      .status(StatusCodes.OK)
      .json({ following, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getFollowing error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch following." });
  }
};

/* --------------------------------
   REQUESTS (incoming/outgoing)
----------------------------------- */

export const getFollowRequests = async (req, res) => {
  try {
    const userId = req.userId;
    const direction = (req.query.direction || "incoming").toString(); // "incoming" | "outgoing"
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const where =
      direction === "outgoing"
        ? { followerId: userId, status: "PENDING" }
        : { followingId: userId, status: "PENDING" };

    const [rows, total] = await Promise.all([
      prisma.follow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include:
          direction === "outgoing"
            ? { following: { select: { id: true, username: true, avatar: true, isPublic: true } } }
            : { follower: { select: { id: true, username: true, avatar: true, isPublic: true } } },
      }),
      prisma.follow.count({ where }),
    ]);

    const items =
      direction === "outgoing"
        ? rows.map((r) => ({ ...r.following, requestedAt: r.createdAt }))
        : rows.map((r) => ({ ...r.follower, requestedAt: r.createdAt }));

    return res
      .status(StatusCodes.OK)
      .json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("getFollowRequests error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch requests." });
  }
};
/* --------------------------------
      CONTACTS
----------------------------------- */

export const addContact = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (id === userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "You cannot add yourself." });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { contacts: { connect: { id } } },
    });
    await prisma.user.update({
      where: { id },
      data: { contacts: { connect: { id: userId } } },
    });

    return res.status(StatusCodes.OK).json({ message: "Contact added." });
  } catch (err) {
    console.error("addContact error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to add contact." });
  }
};

export const getContacts = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { contacts: { select: { id: true, username: true, avatar: true } } },
    });
    return res.status(StatusCodes.OK).json(user?.contacts || []);
  } catch (err) {
    console.error("getContacts error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get contacts." });
  }
};

/* --------------------------------
          STORIES
----------------------------------- */

// Create story
export const createStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { mediaUrl, type, caption, isPublic } = req.body || {};
    if (!mediaUrl || !type) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "mediaUrl and type are required." });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId,
        mediaUrl,
        type,
        caption: caption || null,
        isPublic: typeof isPublic === "boolean" ? isPublic : true,
        createdAt: now,
        expiresAt,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    return res.status(StatusCodes.CREATED).json(story);
  } catch (err) {
    console.error("createStory error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to create story." });
  }
};

// Get stories: public OR by user id (and not expired)
export const getStories = async (req, res) => {
  try {
    const { id } = req.params; // optional
    const now = new Date();

    const where = id
      ? { userId: id, expiresAt: { gt: now } }
      : { isPublic: true, expiresAt: { gt: now } };

    const stories = await prisma.story.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    return res.status(StatusCodes.OK).json(stories);
  } catch (err) {
    console.error("getStories error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch stories." });
  }
};

// Delete story (owner only)
export const deleteStory = async (req, res) => {
  try {
    const userId = req.userId;
    const { storyId } = req.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, userId: true },
    });

    if (!story) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Story not found." });
    }
    if (story.userId !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Not allowed." });
    }

    await prisma.story.delete({ where: { id: storyId } });
    return res.status(StatusCodes.OK).json({ ok: true });
  } catch (err) {
    console.error("deleteStory error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete story." });
  }
};
