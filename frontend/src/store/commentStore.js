"use client";
/**
 * Comment Store (matches controller)
 * - GET /posts/:postId/comments?mode=flat|tree&page&limit
 * - POST /posts/:postId/comments { content, parentId? }
 * - DELETE /comments/:id
 * - GET /comments/:id/replies?page&limit&order
 *
 * Notes:
 * - Default mode is "flat" to align with feed-style lists + pagination.
 * - If you switch to "tree", we store the nested structure and synthesize a simple pagination bucket.
 */
import { create } from "zustand";
import api from "@/lib/axios";
import { useFeedStore } from "./feedStore";

function removeFromTree(items, targetId) {
  // Recursively remove a node (and its subtree) by id
  const walk = (arr) =>
    arr
      .filter((n) => n.id !== targetId)
      .map((n) =>
        n.replies?.length ? { ...n, replies: walk(n.replies) } : n
      );
  return walk(items || []);
}

export const useCommentStore = create((set, get) => ({
  byPost: {
    // [postId]: {
    //   mode: 'flat' | 'tree',
    //   items: [],
    //   pagination: { page, limit, total, pages },
    // }
  },
  isLoading: false,
  error: null,

  /**
   * Fetch comments for a post.
   * opts: { page=1, limit=20, mode='flat' }
   */
  fetchForPost: async (postId, opts = {}) => {
    const { page = 1, limit = 20, mode = "flat" } = opts;
    set({ isLoading: true, error: null });

    try {
      const params = { page, limit, mode };
      const { data } = await api.get(`/posts/${postId}/comments`, { params });

      // Controller returns:
      // - mode=flat -> { comments, pagination }
      // - mode=tree -> [ nestedRoots ]
      if (mode === "flat") {
        const items = Array.isArray(data?.comments) ? data.comments : [];
        const pagination =
          data?.pagination || { page, limit, total: items.length, pages: 1 };

        set((s) => ({
          byPost: {
            ...s.byPost,
            [postId]: {
              mode,
              items: page === 1
                ? items
                : [ ...(s.byPost[postId]?.items || []), ...items ],
              pagination,
            },
          },
          isLoading: false,
        }));
      } else {
        // tree mode: store as-is; synthesize a basic pagination bucket
        const roots = Array.isArray(data) ? data : [];
        set((s) => ({
          byPost: {
            ...s.byPost,
            [postId]: {
              mode,
              items: roots,
              pagination: { page: 1, limit, total: roots.length, pages: 1 },
            },
          },
          isLoading: false,
        }));
      }
      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load comments";
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  /**
   * Add a comment or reply.
   * Accepts:
   *  - addComment(postId, "text")
   *  - addComment(postId, { content: "text", parentId })
   */
  addComment: async (postId, payload) => {
    try {
      const body =
        typeof payload === "string"
          ? { content: payload }
          : { content: payload?.content, parentId: payload?.parentId };

      if (!body?.content || !String(body.content).trim()) {
        throw new Error("Comment cannot be empty");
      }

      const { data } = await api.post(`/posts/${postId}/comments`, body);
      // data: created comment { id, content, author, createdAt, parentId? }

      set((s) => {
        const bucket = s.byPost[postId] || { mode: "flat", items: [], pagination: { page: 1, limit: 20 } };
        const mode = bucket.mode || "flat";

        if (mode === "tree") {
          // Insert into tree (either as root, or as child of parentId)
          const items = Array.isArray(bucket.items) ? [...bucket.items] : [];
          if (data.parentId) {
            // DFS to find parent and push into replies
            const stack = [...items];
            while (stack.length) {
              const node = stack.pop();
              if (node.id === data.parentId) {
                const replies = Array.isArray(node.replies) ? node.replies.slice() : [];
                replies.push({ ...data, replies: [] });
                node.replies = replies;
                break;
              }
              if (node.replies?.length) stack.push(...node.replies);
            }
            return {
              byPost: { ...s.byPost, [postId]: { ...bucket, items } },
            };
          } else {
            // root
            return {
              byPost: { ...s.byPost, [postId]: { ...bucket, items: [data, ...items] } },
            };
          }
        } else {
          // flat mode: prepend new comment
          const items = [data, ...(bucket.items || [])];
          const pagination = {
            ...(bucket.pagination || { page: 1, limit: 20, total: 0, pages: 1 }),
            total: (bucket.pagination?.total ?? items.length) + 1,
          };
          return {
            byPost: { ...s.byPost, [postId]: { ...bucket, items, pagination } },
          };
        }
      });

      // Optimistically bump commentsCount on feed card if present
      try {
        const feedState = useFeedStore.getState();
        const currentPost =
          feedState.home.find((p) => p.id === postId) ||
          feedState.explore.find((p) => p.id === postId);
        const currentCount = Number(currentPost?.commentsCount || 0);
        feedState.patchFeedItem?.(postId, { commentsCount: currentCount + 1 });
      } catch {}

      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to add comment";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  /**
   * Delete a comment (and its subtree server-side).
   * We optimistically remove it from local cache.
   */
  deleteComment: async (commentId, postId) => {
    try {
      await api.delete(`/comments/${commentId}`);

      set((s) => {
        const bucket = s.byPost[postId];
        if (!bucket) return s;

        if (bucket.mode === "tree") {
          return {
            byPost: {
              ...s.byPost,
              [postId]: { ...bucket, items: removeFromTree(bucket.items, commentId) },
            },
          };
        } else {
          const items = (bucket.items || []).filter((c) => c.id !== commentId);
          const pagination = {
            ...(bucket.pagination || { page: 1, limit: 20, total: items.length, pages: 1 }),
            total: Math.max(0, (bucket.pagination?.total ?? items.length + 1) - 1),
          };
          return {
            byPost: { ...s.byPost, [postId]: { ...bucket, items, pagination } },
          };
        }
      });

      // Optionally decrement commentsCount on feed card
      try {
        const feedState = useFeedStore.getState();
        const currentPost =
          feedState.home.find((p) => p.id === postId) ||
          feedState.explore.find((p) => p.id === postId);
        const currentCount = Number(currentPost?.commentsCount || 0);
        feedState.patchFeedItem?.(postId, { commentsCount: Math.max(0, currentCount - 1) });
      } catch {}

      return true;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to delete comment";
      set({ error: msg });
      throw new Error(msg);
    }
  },

  /**
   * Fetch direct replies for a comment (useful when lazy-loading threads)
   * -> GET /comments/:id/replies?page&limit&order
   * Returns { replies, parentCommentId, pagination }
   */
  fetchReplies: async (commentId, { page = 1, limit = 20, order = "asc", postId } = {}) => {
    try {
      const { data } = await api.get(`/comments/${commentId}/replies`, {
        params: { page, limit, order },
      });

      if (postId) {
        // If the bucket is tree mode, merge into the node's replies
        set((s) => {
          const bucket = s.byPost[postId];
          if (!bucket || bucket.mode !== "tree") return s;

          const items = Array.isArray(bucket.items) ? [...bucket.items] : [];
          const stack = [...items];
          while (stack.length) {
            const node = stack.pop();
            if (node.id === commentId) {
              const existing = Array.isArray(node.replies) ? node.replies.slice() : [];
              const merged = page === 1 ? data.replies : [...existing, ...data.replies];
              node.replies = merged;
              break;
            }
            if (node.replies?.length) stack.push(...node.replies);
          }

          return { byPost: { ...s.byPost, [postId]: { ...bucket, items } } };
        });
      }

      return data;
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to load replies";
      set({ error: msg });
      throw new Error(msg);
    }
  },
}));
