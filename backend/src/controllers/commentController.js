import prisma from "../utils/db.js";
import { z } from "zod";
import { StatusCodes } from "http-status-codes";
import { io } from "../server.js"; // ✅ for realtime notify

// Body schema
const commentSchema = z.object({
  content: z.string().min(1, "Content is required"),
  parentId: z.string().uuid().optional(),
});

// ---------- CREATE ----------
/**
 * POST /posts/:postId/comments
 * Body: { content, parentId? }
 */
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(StatusCodes.BAD_REQUEST).json({ error: parsed.error });

    const { content, parentId } = parsed.data;

    // Ensure post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, isPublic: true },
    });
    if (!post) return res.status(StatusCodes.NOT_FOUND).json({ error: "Post not found" });

    // If replying, ensure parent belongs to same post
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.postId !== postId) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: "Invalid parent comment" });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        author: { connect: { id: userId } },
        post: { connect: { id: postId } },
        ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
      },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
    });

    // Create a notification for the post author (don’t notify self)
    if (post.authorId !== userId) {
      const notif = await prisma.notification.create({
        data: {
          type: "COMMENT",
          message: "New comment on your post",
          recipientId: post.authorId,
          relatedUserId: userId,
          relatedPostId: postId,
        },
      });
      // Optional realtime: emit to personal room (FE should join `user:<id>`)
      io.to(`user:${post.authorId}`).emit("notification:new", notif);
    }

    return res.status(StatusCodes.CREATED).json(comment);
  } catch (err) {
    console.error("createComment error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to add comment" });
  }
};

// ---------- GET (tree or flat) ----------
/**
 * GET /posts/:postId/comments?mode=tree|flat&page=1&limit=20
 * Default mode = tree (nested)
 */
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const mode = (req.query.mode || "tree").toString().toLowerCase();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 100);
    const skip = (page - 1) * limit;

    // Validate post
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return res.status(StatusCodes.NOT_FOUND).json({ error: "Post not found" });

    if (mode === "flat") {
      const [rows, total] = await Promise.all([
        prisma.comment.findMany({
          where: { postId },
          orderBy: { createdAt: "asc" },
          skip,
          take: limit,
          include: {
            author: { select: { id: true, username: true, avatar: true } },
          },
        }),
        prisma.comment.count({ where: { postId } }),
      ]);

      return res.status(StatusCodes.OK).json({
        comments: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }

    // mode: tree
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
      },
    });

    const map = {};
    comments.forEach((c) => (map[c.id] = { ...c, replies: [] }));
    const roots = [];
    comments.forEach((c) => {
      if (c.parentId) {
        if (map[c.parentId]) map[c.parentId].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    return res.status(StatusCodes.OK).json(roots);
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch comments" });
  }
};

// ---------- DELETE ----------
/**
 * DELETE /comments/:id
 * Author-only delete (hard delete). If you want soft-delete in future, add a `deletedAt` column.
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return res.status(StatusCodes.NOT_FOUND).json({ error: "Comment not found" });
    if (comment.authorId !== userId) return res.status(StatusCodes.FORBIDDEN).json({ error: "Not allowed" });

    // Hard delete removes children via onDelete? (Your schema doesn’t specify.)
    // Prisma won't cascade delete Comment->replies automatically; you can either:
    //   (a) deleteMany descendants (simple), or
    //   (b) prevent delete if it has replies.
    // Here we choose (a) delete subtree:

    // fetch all for this post (tiny helper)
    const all = await prisma.comment.findMany({ where: { postId: comment.postId } });
    const idsToDelete = [];
    const byParent = new Map();
    all.forEach((c) => {
      const arr = byParent.get(c.parentId || "__root__") || [];
      arr.push(c);
      byParent.set(c.parentId || "__root__", arr);
    });

    const stack = [comment.id];
    while (stack.length) {
      const cur = stack.pop();
      idsToDelete.push(cur);
      const kids = byParent.get(cur) || [];
      kids.forEach((k) => stack.push(k.id));
    }

    await prisma.comment.deleteMany({ where: { id: { in: idsToDelete } } });

    return res.status(StatusCodes.OK).json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to delete comment" });
  }
};
// Get direct replies for a comment (paginated)
// GET /comments/:id/replies?page=1&limit=20&order=asc|desc
export const getCommentReplies = async (req, res) => {
  try {
    const { id } = req.params; // parent comment id
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const order = (req.query.order || "asc").toString().toLowerCase() === "desc" ? "desc" : "asc";
    const skip = (page - 1) * limit;

    // Ensure parent comment exists
    const parent = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, postId: true },
    });
    if (!parent) return res.status(StatusCodes.NOT_FOUND).json({ error: "Comment not found" });

    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where: { parentId: id },
        orderBy: { createdAt: order },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, username: true, avatar: true } },
        },
      }),
      prisma.comment.count({ where: { parentId: id } }),
    ]);

    return res.status(StatusCodes.OK).json({
      replies: rows,
      parentCommentId: id,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getCommentReplies error:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch replies" });
  }
};
