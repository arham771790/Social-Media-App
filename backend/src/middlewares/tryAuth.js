// src/middlewares/tryAuth.js
import jwt from 'jsonwebtoken';

export const tryAuth = (req, _res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // normalize common fields
    req.userId = payload.userId || payload.id || payload.sub;
  } catch {
    // ignore bad tokens; route remains public
  }
  next();
};
