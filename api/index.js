// Vercel single API entry — rewrite sends /api/auth, /api/brain, etc. to /api?path=auth
import { getTokenFromRequest, verifyToken } from '../src/lib/auth.js';
import brainHandler from './brain.js';
import brainSkillsHandler from './brain-skills.js';
import brainStatsHandler from './brain-stats.js';
import brainSessionsHandler from './brain-sessions.js';
import agentsHandler from './agents.js';
import sessionCompleteHandler from './session-complete.js';
import sessionFocusHandler from './session-focus.js';
import saveCardHandler from './save-card.js';
import learnersHandler from './learners.js';
import authHandler from './auth.js';
import sessionHandler from './session.js';
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
    end: (data) => {
      if (typeof res.end === 'function') res.end(data);
      else if (typeof res.send === 'function') res.send(data);
      else res.status(res.statusCode || 200).send(data);
      return this;
    },
  };
}

function getRawBody(req) {
  return new Promise(function(resolve) {
    if (req.body != null) {
      if (typeof req.body === 'string') return resolve(req.body);
      if (Buffer.isBuffer(req.body)) return resolve(req.body.toString('utf8'));
      if (req.body && req.body.sdp) return resolve(req.body.sdp);
    }
    if (typeof req.text === 'function') return req.text().then(function(t) { resolve(t || ''); }).catch(function() { resolve(''); });
    var chunks = [];
    req.on('data', function(chunk) { chunks.push(chunk); });
    req.on('end', function() { resolve(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', function() { resolve(''); });
  });
}

async function collectBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = typeof req.body === 'string' ? req.body : (req.text ? await req.text() : '') || '';
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}

function getPathParam(req) {
  if (req.query && req.query.path != null) return req.query.path;
  const url = req.url || req.originalUrl || '';
  const q = url.includes('?') ? url.split('?')[1] : '';
  const params = new URLSearchParams(q);
  return params.get('path') || '';
}

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const pathParam = getPathParam(req);
    const pathSegs = (Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam)).split('/').filter(Boolean);
    const route = pathSegs[0] || '';

    const body = req.method === 'POST' ? await collectBody(req) : {};
    const wrappedReq = { method: req.method, headers: req.headers || {}, body, user: null, url: req.url || req.originalUrl || '' };
    const nres = toNodeRes(res);

    if (route === 'auth') {
      await authHandler(wrappedReq, nres);
      return;
    }
    if (route === 'session') {
      const sessionBody = req.method === 'POST' ? await collectBody(req) : {};
      await sessionHandler(req, res, sessionBody);
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
          brain_nodes: parseInt((nodes.rows[0] && nodes.rows[0].count) || 0),
          brain_edges: parseInt((edges.rows[0] && edges.rows[0].count) || 0),
          episodes: parseInt((episodes.rows[0] && episodes.rows[0].count) || 0),
          learners: parseInt((learners.rows[0] && learners.rows[0].count) || 0),
          },
        });
      } catch (err) {
        return res.status(500).json({ status: 'db_error', error: err.message });
      }
    }
    if (route === 'schema-check') {
      try {
        const cols = await query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('episodes', 'brain_nodes') AND column_name = 'metadata'`);
        const hasEpisodes = cols.rows.some((r) => r.table_name === 'episodes');
        const hasBrainNodes = cols.rows.some((r) => r.table_name === 'brain_nodes');
        return res.status(200).json({
          episodes_has_metadata: hasEpisodes,
          brain_nodes_has_metadata: hasBrainNodes,
          fix: !hasEpisodes || !hasBrainNodes
            ? 'Run in Neon SQL Editor: ALTER TABLE episodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT \'{}\'; ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT \'{}\';'
            : null,
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
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
      if (route === 'brain') {
        const sub = pathSegs[1];
        if (sub === 'skills') return await brainSkillsHandler(wrappedReq, nres);
        if (sub === 'stats') return await brainStatsHandler(wrappedReq, nres);
        if (sub === 'sessions') return await brainSessionsHandler(wrappedReq, nres);
        return brainHandler(wrappedReq, nres);
      }
      if (route === 'agents') return agentsHandler(wrappedReq, nres);
      if (route === 'session-complete') return sessionCompleteHandler(wrappedReq, nres);
      if (route === 'session-focus') return sessionFocusHandler(wrappedReq, nres);
      if (route === 'save-card') return saveCardHandler(wrappedReq, nres);
    } catch (err) {
      console.error('[api]', err);
      return res.status(500).json({ error: err.message });
    }

    return res.status(404).end();
  } catch (err) {
    console.error('[api] unhandled:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
