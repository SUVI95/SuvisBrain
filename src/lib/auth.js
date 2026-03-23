/**
 * JWT auth — learner (own data only) or teacher (all data)
 */
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const EXPIRY = '7d';

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

export function getTokenFromRequest(req) {
  const auth = (req.headers && req.headers.authorization) || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function requireAuth(req, res, handler) {
  const token = getTokenFromRequest(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
    return false;
  }
  req.user = user;
  return handler(req, res);
}
