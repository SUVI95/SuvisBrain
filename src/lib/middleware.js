/**
 * Auth middleware — require valid JWT, attach req.user
 */
import { getTokenFromRequest, verifyToken } from './auth.js';

/**
 * Calls handler only if req has valid JWT. Sets req.user. Returns false if rejected.
 * @param {Object} req - request with headers
 * @param {Object} res - response (Node or Vercel style)
 * @param {Function} handler - (req, res) => Promise
 * @returns {boolean} - true if handler was invoked
 */
export async function requireAuth(req, res, handler) {
  const token = getTokenFromRequest(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return false;
  }
  req.user = user;
  return handler(req, res);
}

/**
 * Send JSON response (works with both Node http and Vercel res)
 */
export function sendJson(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  const headers = { 'Content-Type': 'application/json' };
  if (typeof res.writeHead === 'function') {
    res.writeHead(status, headers);
    res.end(body);
  } else {
    res.status(status).setHeader('Content-Type', 'application/json').end(body);
  }
}
