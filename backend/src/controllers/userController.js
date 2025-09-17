import prisma from "../utils/db.js";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";

// Schema for updating user profile
const updateSchema = z.object({
  avatar: z.string().url().optional(),
  bio: z.string().max(256).optional(),
  isPublic: z.boolean().optional()
});
async function canViewPrivateContent(targetUserId, viewerId) {
  if (!viewerId) return false;
  if (viewerId === targetUserId) return true;

  const rel = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: targetUserId } },
    select: { status: true },
  });
  return rel?.status === "ACCEPTED";
}


/**
 * Get current logged-in user's profile
 * @route GET /users/me
 * @requires JWT
 */
export const me = async (req, res) => {
  const userId = req.userId;
  // Find user by ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      username: true, 
      email: true, 
      avatar: true, 
      bio: true, 
      isPublic: true,
      settings: {
        select: {
          showActivityStatus: true,
          privacyLastSeen: true
        }
      }
    }
  });
  if (!user)
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Not found" });
  res.status(StatusCodes.OK).json(user);
};

/**
 * Update the current user's profile
 * @route PUT /users/me
 * @requires JWT
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    // Validate and parse body
    const data = updateSchema.parse(req.body);

    // Update user profile
    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });

    res.status(StatusCodes.OK).json({ 
      id: updated.id, 
      username: updated.username, 
      avatar: updated.avatar, 
      bio: updated.bio, 
      isPublic: updated.isPublic 
    });
  } catch (err) {
    // If Zod throws, it means bad input
    res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid update data" });
  }
};

/**
 * Get any user's public profile by ID
 * @route GET /users/:id
 */
 export const getUserProfile = async (req, res) => {
   const { id } = req.params;
   const currentUserId = req.userId;

   const user = await prisma.user.findUnique({
     where: { id },
     select: { 
       id: true, 
       username: true, 
       avatar: true, 
       bio: true, 
       isPublic: true,
       settings: {
         select: {
           showActivityStatus: true,
           privacyLastSeen: true
         }
       },
       _count: {
         select: {
           followers: true,
           following: true,
           posts: true
         }
       }
     }
   });
   if (!user) {
     return res.status(StatusCodes.NOT_FOUND).json({ error: "Profile not found" });
   }

  // Insta-style: header + counts are visible even if private
  // Content (posts, followers/following lists) visibility is separate
  const allowed = user.isPublic || await canViewPrivateContent(user.id, currentUserId);

   // follow status for viewer
  let followStatus = "NONE";
   if (currentUserId && currentUserId !== id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: id } },
      select: { status: true },
    });
    followStatus = follow?.status || "NONE"; // NONE | PENDING | ACCEPTED | DECLINED
   }

   const isOnline = !!user.settings?.showActivityStatus;

   res.status(StatusCodes.OK).json({
     ...user,
     followStatus,
     isOnline,
     lastSeen: user.settings?.privacyLastSeen ? new Date() : null,
    // Frontend can use this to decide whether to load posts/lists
    canViewContent: allowed
   });
 };


/**
 * Follow a user
 * @route POST /users/:id/follow
 * @requires JWT
 */
export const followUser = async (req, res) => {
  try {
    const followerId = req.userId;
    const { id: followingId } = req.params;

    if (followerId === followingId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Cannot follow yourself" });
    }

    // Check if target user exists and is public
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true, isPublic: true }
    });

    if (!targetUser) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }

    if (!targetUser.isPublic) {
      return res.status(StatusCodes.FORBIDDEN).json({ error: "Cannot follow private user" });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId,
        followingId
      }
    });

    if (existingFollow) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Already following this user" });
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId
      }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'FOLLOW',
        message: `@${req.user?.username || 'Someone'} started following you`,
        recipientId: followingId,
        relatedUserId: followerId
      }
    });

    res.status(StatusCodes.CREATED).json({ message: "Successfully followed user" });
  } catch (err) {
    console.error("followUser error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to follow user" });
  }
};

/**
 * Unfollow a user
 * @route DELETE /users/:id/follow
 * @requires JWT
 */
export const unfollowUser = async (req, res) => {
  try {
    const followerId = req.userId;
    const { id: followingId } = req.params;

    if (followerId === followingId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Cannot unfollow yourself" });
    }

    // Check if following relationship exists
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId,
        followingId
      }
    });

    if (!existingFollow) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Not following this user" });
    }

    // Remove follow relationship
    await prisma.follow.delete({
      where: { id: existingFollow.id }
    });

    res.status(StatusCodes.OK).json({ message: "Successfully unfollowed user" });
  } catch (err) {
    console.error("unfollowUser error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to unfollow user" });
  }
};

/**
 * Get user's followers
 * @route GET /users/:id/followers
 */
export const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Check if user exists and is public
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true }
    });

    if (!user || !user.isPublic) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found or is private" });
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: id },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: {
              select: {
                showActivityStatus: true,
                privacyLastSeen: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add follow status for current user
    const followersWithStatus = followers.map(follow => ({
      ...follow.follower,
      isOnline: follow.follower.settings?.showActivityStatus ? true : false,
      lastSeen: follow.follower.settings?.privacyLastSeen ? new Date() : null,
      followedAt: follow.createdAt
    }));

    const total = await prisma.follow.count({
      where: { followingId: id }
    });

    res.status(StatusCodes.OK).json({
      followers: followersWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("getFollowers error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get followers" });
  }
};

/**
 * Get user's following
 * @route GET /users/:id/following
 */
export const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Check if user exists and is public
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true }
    });

    if (!user || !user.isPublic) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found or is private" });
    }

    const following = await prisma.follow.findMany({
      where: { followerId: id },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            settings: {
              select: {
                showActivityStatus: true,
                privacyLastSeen: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add follow status for current user
    const followingWithStatus = following.map(follow => ({
      ...follow.following,
      isOnline: follow.following.settings?.showActivityStatus ? true : false,
      lastSeen: follow.following.settings?.privacyLastSeen ? new Date() : null,
      followedAt: follow.createdAt
    }));

    const total = await prisma.follow.count({
      where: { followerId: id }
    });

    res.status(StatusCodes.OK).json({
      following: followingWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("getFollowing error", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to get following" });
  }
};

/**
 * GET /users/search?q=...&page=&limit=
 * Includes private users like Instagram; marks isPublic and followStatus.
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const currentUserId = req.userId;

    if (!q) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: "Search query is required" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        isPublic: true,
        settings: { select: { showActivityStatus: true, privacyLastSeen: true } },
        _count: { select: { followers: true, following: true, posts: true } },
      },
      orderBy: { username: "asc" },
    });

    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        let followStatus = "NONE";
        if (currentUserId && currentUserId !== user.id) {
          const follow = await prisma.follow.findUnique({
            where: {
              followerId_followingId: { followerId: currentUserId, followingId: user.id },
            },
            select: { status: true },
          });
          followStatus = follow?.status || "NONE";
        }
        return {
          ...user,
          followStatus,
          isOnline: !!user.settings?.showActivityStatus,
          lastSeen: user.settings?.privacyLastSeen ? new Date() : null,
        };
      })
    );

    const total = await prisma.user.count({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
    });

    return res.status(StatusCodes.OK).json({
      users: usersWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error("searchUsers error", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to search users" });
  }
};

/**
 * Get user profile by username
 * @route GET /users/username/:username
 */
 /**
 * GET /users/username/:username
 * Instagram-like: show header + counts even if private; gate content via canViewContent.
 */
export const getUserByUsername = async (req, res) => {
  const { username } = req.params;
  const currentUserId = req.userId;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      isPublic: true,
      _count: { select: { followers: true, following: true, posts: true } },
    },
  });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: "Profile not found" });
  }

  const allowed = user.isPublic || (await canViewPrivateContent(user.id, currentUserId));

  let followStatus = "NONE";
  if (currentUserId && currentUserId !== user.id) {
    const follow = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: currentUserId, followingId: user.id } },
      select: { status: true },
    });
    followStatus = follow?.status || "NONE";
  }

  return res
    .status(StatusCodes.OK)
    .json({ ...user, followStatus, canViewContent: allowed });
};

