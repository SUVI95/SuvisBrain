/**
 * In-memory rate limiter (per IP).
 * For serverless, each instance has its own store — consider Redis for multi-instance.
 */
const store = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 min

function getKey(ip, path) {
  return `${ip || 'unknown'}:${path || 'api'}`;
}

function cleanup() {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.resetAt < now) store.delete(k);
  }
}
if (typeof setInterval !== 'undefined') setInterval(cleanup, 60000);

/**
 * Check rate limit. Returns { ok: true } or { ok: false, retryAfter }.
 * @param {string} ip - client IP
 * @param {string} path - route path (e.g. 'auth', 'api')
 * @param {number} max - max requests per window
 */
export function checkLimit(ip, path, max) {
  const key = getKey(ip, path);
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }
  entry.count++;
  if (entry.count > max) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}

export const LIMITS = {
  auth: 10,
  api: 100,
};
