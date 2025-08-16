// feedApi.js
import { authFetch, handleError } from './axios';

export const feedAPI = {
  getFeed: async (page = 1, limit = 20) => {
    const res = await authFetch(`/api/posts?page=${page}&limit=${limit}`);
    if (!res.ok) await handleError(res, 'Failed to fetch feed');
    return res.json();
  },

  getPost: async (postId) => {
    const res = await authFetch(`/api/posts/${postId}`);
    if (!res.ok) await handleError(res, 'Failed to fetch post');
    return res.json();
  },

  createPost: async (postData) => {
    const res = await authFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    if (!res.ok) await handleError(res, 'Failed to create post');
    return res.json();
  },

  toggleLike: async (postId) => {
    const res = await authFetch(`/api/posts/${postId}/like`, { method: 'POST' });
    if (!res.ok) await handleError(res, 'Failed to toggle like');
    return res.json();
  },

  toggleBookmark: async (postId) => {
    const res = await authFetch(`/api/posts/${postId}/bookmark`, { method: 'POST' });
    if (!res.ok) await handleError(res, 'Failed to toggle bookmark');
    return res.json();
  },

  deletePost: async (postId) => {
    const res = await authFetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (!res.ok) await handleError(res, 'Failed to delete post');
    return res.json();
  },
};
