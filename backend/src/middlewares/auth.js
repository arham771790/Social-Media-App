// middlewares/auth.js
import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  try {
    const header = req.headers['authorization'] || req.headers['Authorization'];
    if (!header) return res.status(401).json({ error: 'Authorization header missing' });

    const [scheme, token] = header.trim().split(/\s+/);
    if ((scheme || '').toLowerCase() !== 'bearer' || !token) {
      return res.status(401).json({ error: 'Malformed Authorization (use: Bearer <token>)' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET not set' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};
