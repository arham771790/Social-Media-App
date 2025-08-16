// src/utils/asyncHandler.js

/**
 * Wrap an Express route/controller to forward any sync/async errors to `next()`,
 * so your centralized error middleware can handle them (prevents unhandled rejections).
 *
 * Usage:
 *   router.post('/file', auth, upload.single('file'), asyncHandler(uploadFile));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
