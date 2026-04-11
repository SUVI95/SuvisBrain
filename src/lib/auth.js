/**
 * JWT auth — learner (own data only) or teacher (all data)
 */
import jwt from 'jsonwebtoken';

/**
 * Signing secret must be identical on every server that verifies tokens (local, Vercel Preview, Production).
 * If login works locally but /api/* returns 401 on Vercel, set JWT_SECRET on Vercel to the same value as local .env and log in again.
 */
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
  const headers = req && req.headers;
  if (!headers) return null;
  let auth = '';
  if (typeof headers.get === 'function') {
    auth = headers.get('authorization') || headers.get('Authorization') || '';
  } else {
    auth = headers.authorization || headers.Authorization || '';
    if (!auth && typeof headers === 'object') {
      const key = Object.keys(headers).find((k) => k.toLowerCase() === 'authorization');
      if (key) auth = String(headers[key] || '');
    }
  }
  auth = String(auth || '');
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
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
