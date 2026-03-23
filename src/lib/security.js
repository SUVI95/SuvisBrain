/**
 * Security headers, CORS, safe error responses
 */

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://suvisbrain.vercel.app'];

function getAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;
  if (env) {
    return [...DEFAULT_ORIGINS, ...env.split(',').map((s) => s.trim()).filter(Boolean)];
  }
  return DEFAULT_ORIGINS;
}

/**
 * Set security headers and CORS on response.
 * @param {Object} req - request with headers
 * @param {Object} res - response
 */
export function setSecurityHeaders(req, res) {
  const origins = getAllowedOrigins();
  const origin = (req.headers && req.headers.origin) || '';
  const allowOrigin = origins.includes(origin) ? origin : origins[0];
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Relaxed CSP to allow existing inline scripts; tighten when refactoring
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://api.openai.com https://openrouter.ai wss:; font-src 'self' https://fonts.gstatic.com;");
  } else if (res.setHeader) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(req) {
  return (
    (req.headers && req.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Safe error response — never expose stack traces.
 */
export function sendError(res, status = 500, message = 'Something went wrong') {
  const body = JSON.stringify({ error: message });
  if (typeof res.writeHead === 'function') {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(body);
  } else {
    res.status(status).setHeader('Content-Type', 'application/json').end(body);
  }
}
