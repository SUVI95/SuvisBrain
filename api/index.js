// Vercel single API entry — rewrite sends /api/auth, /api/brain, etc. to /api?path=auth
import { getTokenFromRequest, verifyToken } from '../src/lib/auth.js';
import { setSecurityHeaders, getClientIp, sendError } from '../src/lib/security.js';
import { checkLimit, LIMITS } from '../src/lib/rate-limit.js';
import brainHandler from './brain.js';
import brainSearchHandler from './brain-search.js';
import brainUseFreezeHandler from './brain-use-freeze.js';
import brainSkillsHandler from './brain-skills.js';
import brainStatsHandler from './brain-stats.js';
import brainSessionsHandler from './brain-sessions.js';
import agentsHandler from './agents.js';
import agentPromptHandler from './agent-prompt.js';
import sessionCompleteHandler from './session-complete.js';
import sessionFocusHandler from './session-focus.js';
import saveCardHandler from './save-card.js';
import learnersHandler from './learners.js';
import authHandler from './auth.js';
import registerHandler from './auth-register.js';
import sessionHandler from './session.js';
import weeklyEmailHandler from './cron-weekly.js';
import ykiScoreHandler from './yki-score.js';
import userDataHandler from './user-data.js';
import teacherOverrideHandler, { teacherCefrOverrideHandler } from './teacher-override.js';
import { getLearnersHandler, nudgeHandler, nudgeBulkHandler } from './teacher-dashboard.js';
import { getLeadsHandler, patchLeadHandler } from './leads.js';
import adminOrganisationsHandler from './admin-organisations.js';
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
    setSecurityHeaders(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const pathParam = getPathParam(req);
    const pathSegs = (Array.isArray(pathParam) ? pathParam.join('/') : String(pathParam)).split('/').filter(Boolean);
    const route = pathSegs[0] || '';
    const ip = getClientIp(req);
    const limitPath = route === 'auth' ? 'auth' : 'api';
    const limit = checkLimit(ip, limitPath, LIMITS[limitPath]);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfter || 900));
      return res.status(429).json({ error: 'Too many requests' });
    }

    const body = (req.method === 'POST' || req.method === 'PATCH') ? await collectBody(req) : {};
    const wrappedReq = { method: req.method, headers: req.headers || {}, body, user: null, url: req.url || req.originalUrl || '' };
    const nres = toNodeRes(res);

    if (route === 'auth') {
      if (pathSegs[1] === 'register') {
        await registerHandler(wrappedReq, nres);
      } else {
        await authHandler(wrappedReq, nres);
      }
      return;
    }
    if (route === 'session') {
      const token = getTokenFromRequest(req);
      const user = token ? verifyToken(token) : null;
      if (!user) return res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
      wrappedReq.user = user;
      const sessionBody = req.method === 'POST' ? await collectBody(req) : {};
      await sessionHandler(wrappedReq, res, sessionBody);
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
        const counts = {
          brain_nodes: parseInt((nodes.rows[0] && nodes.rows[0].count) || 0),
          brain_edges: parseInt((edges.rows[0] && edges.rows[0].count) || 0),
          episodes: parseInt((episodes.rows[0] && episodes.rows[0].count) || 0),
          learners: parseInt((learners.rows[0] && learners.rows[0].count) || 0),
        };
        const checks = { database: 'ok' };
        if (process.env.OPENAI_API_KEY) {
          try {
            const oaiRes = await fetch('https://api.openai.com/v1/models', {
              headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            });
            checks.openai = oaiRes.ok ? 'ok' : `fail:${oaiRes.status}`;
          } catch (e) {
            checks.openai = 'fail:' + (e.message || 'error');
          }
        } else {
          checks.openai = 'skipped';
        }
        if (process.env.RESEND_API_KEY) {
          try {
            const resendRes = await fetch('https://api.resend.com/domains', {
              headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
            });
            checks.resend = resendRes.ok ? 'ok' : `fail:${resendRes.status}`;
          } catch (e) {
            checks.resend = 'fail:' + (e.message || 'error');
          }
        } else {
          checks.resend = 'skipped';
        }
        return res.status(200).json({ status: 'ok', counts, checks });
      } catch (err) {
        console.error('health:', err);
        return sendError(res, 500);
      }
    }
    if (route === 'schema-check') {
      try {
        // Quick schema health check for the most failure-prone endpoints.
        // NOTE: this is intentionally "schema existence only" (not data correctness).
        const REQUIRED = {
          teacher_learners: [
            ['learners', 'id'],
            ['learners', 'name'],
            ['learners', 'email'],
            ['learners', 'cefr_level'],
            ['learners', 'mother_tongue'],
            ['learners', 'teacher_reviewed_at'],
            ['learners', 'org_id'], // used when teacher JWT has org_id
            ['episodes', 'learner_id'],
            ['episodes', 'title'],
            ['episodes', 'created_at'],
          ],
          brain_stats: [
            ['learners', 'id'],
            ['learners', 'cefr_level'],
            ['learners', 'org_id'],
            ['learners', 'streak_freezes_remaining'],
            ['learners', 'streak_freezes_used'],
            ['episodes', 'learner_id'],
            ['episodes', 'duration_s'],
            ['episodes', 'created_at'],
            ['episodes', 'org_id'],
          ],
          brain_sessions: [
            ['episodes', 'id'],
            ['episodes', 'learner_id'],
            ['episodes', 'title'],
            ['episodes', 'summary'],
            ['episodes', 'duration_s'],
            ['episodes', 'created_at'],
            ['episodes', 'metadata'],
            ['episodes', 'org_id'],
            ['learners', 'org_id'], // used when learner JWT has org_id
          ],
          user_data: [
            ['learners', 'id'],
            ['learners', 'email'],
            ['learners', 'mother_tongue'],
            ['learners', 'cefr_level'],
            ['learners', 'created_at'],
            ['episodes', 'learner_id'],
            ['episodes', 'metadata'],
            ['brain_nodes', 'metadata'],
          ],
        };

        const byTable = {};
        Object.values(REQUIRED).flat().forEach(([table, column]) => {
          if (!byTable[table]) byTable[table] = new Set();
          byTable[table].add(column);
        });

        const present = {};
        for (const table of Object.keys(byTable)) {
          const cols = [...byTable[table]];
          const r = await query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = $1
               AND column_name = ANY($2::text[])`,
            [table, cols]
          );
          present[table] = new Set((r.rows || []).map((x) => x.column_name));
        }

        function missingForFeature(featureKey) {
          const req = REQUIRED[featureKey] || [];
          const missing = [];
          for (const [table, column] of req) {
            if (!present[table] || !present[table].has(column)) {
              missing.push({ table, column });
            }
          }
          return missing;
        }

        const features = Object.keys(REQUIRED).map((k) => {
          const missing = missingForFeature(k);
          return { key: k, missing_columns: missing };
        });

        const ok = features.every((f) => f.missing_columns.length === 0);

        // Small recommended fix pointers. (We keep these high-level since exact defaults are in SQL files.)
        const recommendedFix = !ok
          ? {
              ensure_all_sql: '/src/data/ensure-all.sql',
              streak_migration_sql: '/scripts/migrate-streak-cefr.js (if streak columns are missing)',
              multi_tenancy_migration_sql: '/scripts/migrate-organisations.js (if org_id columns are missing)',
            }
          : null;

        return res.status(200).json({
          ok,
          generated_at: new Date().toISOString(),
          features: Object.fromEntries(features.map((f) => [f.key, { missing_columns: f.missing_columns }])),
          recommended_fix: recommendedFix,
          hint: ok ? null : 'Run the recommended SQL files in Neon, then redeploy/retest.',
        });
      } catch (err) {
        console.error('schema-check:', err);
        return sendError(res, 500);
      }
    }
    if (route === 'cron-weekly') {
      return weeklyEmailHandler(req, nres);
    }
    if (route === 'yki-score') {
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
      if (route === 'teacher') {
        if (pathSegs[1] === 'learners' && req.method === 'GET') return getLearnersHandler(wrappedReq, nres);
        if (pathSegs[1] === 'nudge' && pathSegs[2] && req.method === 'POST') {
          if (pathSegs[2] === 'bulk') return nudgeBulkHandler(wrappedReq, nres);
          return nudgeHandler(wrappedReq, nres, pathSegs[2]);
        }
        nres.writeHead(404);
        nres.end();
        return;
      }
      if (route === 'teacher-override' && req.method === 'POST') {
        return teacherCefrOverrideHandler(wrappedReq, nres);
      }
      if (route === 'learners') {
        const pathname = '/api/learners' + (pathSegs.length > 1 ? '/' + pathSegs.slice(1).join('/') : '');
        if (pathSegs[2] === 'reviewed') return teacherOverrideHandler(wrappedReq, nres, pathname);
        return learnersHandler(wrappedReq, nres, pathname);
      }
      if (route === 'brain') {
        const sub = pathSegs[1];
        if (sub === 'search') return await brainSearchHandler(wrappedReq, nres);
        if (sub === 'use-freeze') return await brainUseFreezeHandler(wrappedReq, nres);
        if (sub === 'skills') return await brainSkillsHandler(wrappedReq, nres);
        if (sub === 'stats') return await brainStatsHandler(wrappedReq, nres);
        if (sub === 'sessions') return await brainSessionsHandler(wrappedReq, nres);
        return brainHandler(wrappedReq, nres);
      }
      if (route === 'agents') {
        if (req.method === 'POST' && pathSegs[1] && pathSegs[2] === 'prompt') {
          return await agentPromptHandler(wrappedReq, nres, pathSegs[1]);
        }
        return agentsHandler(wrappedReq, nres);
      }
      if (route === 'session-complete') return sessionCompleteHandler(wrappedReq, nres);
      if (route === 'session-focus') return sessionFocusHandler(wrappedReq, nres);
      if (route === 'save-card') return saveCardHandler(wrappedReq, nres);
      if (route === 'user-data') return userDataHandler(wrappedReq, nres, '/api/user-data/' + (pathSegs[1] || ''));
      if (route === 'leads') {
        if (req.method === 'GET' && !pathSegs[1]) return getLeadsHandler(wrappedReq, nres);
        if (req.method === 'PATCH' && pathSegs[1]) return patchLeadHandler(wrappedReq, nres, pathSegs[1]);
        nres.writeHead(404);
        nres.end();
        return;
      }
      if (route === 'admin' && pathSegs[1] === 'organisations' && req.method === 'POST') {
        return adminOrganisationsHandler(wrappedReq, nres);
      }
    } catch (err) {
      console.error('[api]', err);
      return sendError(res, 500);
    }

    return res.status(404).end();
  } catch (err) {
    console.error('[api] unhandled:', err);
    return sendError(res, 500);
  }
}
