// Vercel single API entry — rewrite sends /api/auth, /api/brain, etc. to /api?path=auth
import { getTokenFromRequest, verifyToken } from '../src/lib/auth.js';
import brainHandler from './brain.js';
import agentsHandler from './agents.js';
import sessionCompleteHandler from './session-complete.js';
import sessionFocusHandler from './session-focus.js';
import learnersHandler from './learners.js';
import authHandler from './auth.js';
import weeklyEmailHandler from './cron-weekly.js';
import ykiScoreHandler from './yki-score.js';
import { query } from './db.js';

function toNodeRes(res) {
  return {
    setHeader: (k, v) => { res.setHeader(k, v); return this; },
    writeHead: (code, headers) => {
      res.status(code);
      if (headers) Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return this;
    },
    end: (data) => { res.send(data); return this; },
  };
}

async function collectBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = typeof req.body === 'string' ? req.body : (await req.text?.?.()) || '';
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pathParam = req.query.path ?? '';
  const pathSegs = (Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam)).split('/').filter(Boolean);
  const route = pathSegs[0] || '';

  const body = req.method === 'POST' ? await collectBody(req) : {};
  const wrappedReq = { method: req.method, headers: req.headers, body, user: null };
  const nres = toNodeRes(res);

  if (route === 'auth') {
    await authHandler(wrappedReq, nres);
    return;
  }
  if (route === 'health') {
    try {
      const [nodes, edges, episodes, learners] = await Promise.all([
        query('SELECT COUNT(*) FROM brain_nodes'),
        query('SELECT COUNT(*) FROM brain_edges'),
        query('SELECT COUNT(*) FROM episodes'),
        query('SELECT COUNT(*) FROM learners'),
      ]);
      return res.status(200).json({
        status: 'ok',
        counts: {
          brain_nodes: parseInt(nodes.rows[0]?.count || 0),
          brain_edges: parseInt(edges.rows[0]?.count || 0),
          episodes: parseInt(episodes.rows[0]?.count || 0),
          learners: parseInt(learners.rows[0]?.count || 0),
        },
      });
    } catch (err) {
      return res.status(500).json({ status: 'db_error', error: err.message });
    }
  }
  if (route === 'cron-weekly') {
    return weeklyEmailHandler(req, nres);
  }
  if (route === 'yki-score') {
    if (req.method === 'GET') return ykiScoreHandler(req, nres);
    const token = getTokenFromRequest(req);
    const user = token ? verifyToken(token) : null;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    wrappedReq.user = user;
    return ykiScoreHandler(wrappedReq, nres);
  }

  const token = getTokenFromRequest(req);
  const user = token ? verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
  wrappedReq.user = user;

  try {
    if (route === 'learners') {
      return learnersHandler(wrappedReq, nres, '/api/learners' + (pathSegs.length > 1 ? '/' + pathSegs.slice(1).join('/') : ''));
    }
    if (route === 'brain') return brainHandler(wrappedReq, nres);
    if (route === 'agents') return agentsHandler(wrappedReq, nres);
    if (route === 'session-complete') return sessionCompleteHandler(wrappedReq, nres);
    if (route === 'session-focus') return sessionFocusHandler(wrappedReq, nres);
  } catch (err) {
    console.error('[api]', err);
    return res.status(500).json({ error: err.message });
  }

  return res.status(404).end();
}
