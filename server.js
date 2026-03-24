/**
 * SuvisBrain dev server — static files + API routes + voice
 * Knuut voice: verse
 * Run: node server.js
 */

import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

import { getTokenFromRequest, verifyToken } from './src/lib/auth.js';
import { setSecurityHeaders, getClientIp, sendError } from './src/lib/security.js';
import { checkLimit, LIMITS } from './src/lib/rate-limit.js';
import brainHandler from './api/brain.js';
import brainSkillsHandler from './api/brain-skills.js';
import brainStatsHandler from './api/brain-stats.js';
import brainSessionsHandler from './api/brain-sessions.js';
import agentsHandler from './api/agents.js';
import agentPromptHandler from './api/agent-prompt.js';
import sessionCompleteHandler from './api/session-complete.js';
import sessionFocusHandler from './api/session-focus.js';
import saveCardHandler from './api/save-card.js';
import learnersHandler from './api/learners.js';
import authHandler from './api/auth.js';
import registerHandler from './api/auth-register.js';
import weeklyEmailHandler from './api/cron-weekly.js';
import ykiScoreHandler from './api/yki-score.js';
import userDataHandler from './api/user-data.js';
import teacherOverrideHandler, { teacherCefrOverrideHandler } from './api/teacher-override.js';
import { getLearnersHandler, nudgeHandler } from './api/teacher-dashboard.js';
import { getLeadsHandler, patchLeadHandler } from './api/leads.js';
import { query } from './api/db.js';
import { getSystemPrompt, langToIso } from './api/knuut-prompt.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

async function collectBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function serveStatic(pathname, res) {
  let file = join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!extname(file)) file = join(file, 'index.html');
  if (!existsSync(file)) return false;
  const ext = extname(file);
  const contentType = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(readFileSync(file));
  return true;
}

async function handleVoice(pathname, req, res) {
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, voice: !!process.env.OPENAI_API_KEY }));
    return true;
  }

  if ((pathname === '/session' || pathname === '/api/session') && req.method === 'POST') {
    try {
      const token = getTokenFromRequest(req);
      const user = token ? verifyToken(token) : null;
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
      }
      if (!process.env.OPENAI_API_KEY) {
        sendError(res, 500);
        return;
      }
      const contentType = req.headers['content-type'] || '';
      const rawBody = await collectBody(req);
      const body = contentType.includes('json') ? (JSON.parse(rawBody || '{}') || {}) : {};
      const offerSdp = body.sdp || rawBody;
      if (!offerSdp) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing SDP offer' }));
      }

      let learnerId = null;
      if (user.role === 'learner') {
        learnerId = user.id;
      } else if (user.role === 'teacher' && body.learner_id) {
        learnerId = body.learner_id;
      }
      const mode = (body.mode || '').toLowerCase() === 'yki' ? 'yki' : 'regular';
      const dashboardMode = body.dashboard_mode || null;
      const topic = body.topic ? String(body.topic).slice(0, 500) : null;
      const reviewWords = Array.isArray(body.review_words) ? body.review_words : [];
      const focusTopics = Array.isArray(body.focusTopics) ? body.focusTopics : [];
      const writingSample = body.writing_sample ? String(body.writing_sample).slice(0, 2000) : null;

      let learnerCefr = null;
      let nativeLanguage = null;
      let learnerName = null;
      let isFirstSession = false;
      let lastEpisode = null;
      let brainNodes = [];

      if (learnerId) {
        try {
          const [learnerResult, lastEpisodeResult, brainResult] = await Promise.all([
            query(
              `SELECT name, cefr_level, mother_tongue,
                      (SELECT COUNT(*) FROM episodes WHERE learner_id = $1) AS session_count
               FROM learners WHERE id = $2`,
              [learnerId, learnerId]
            ),
            query(
              `SELECT title, summary, raw_transcript, created_at
               FROM episodes WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 1`,
              [learnerId]
            ),
            query(
              `SELECT label, type,
                      (metadata->>'confidence_score')::float as confidence_score,
                      metadata
               FROM brain_nodes
               WHERE type IN ('Skill', 'Memory', 'Conversation')
                 AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
               ORDER BY COALESCE((metadata->>'confidence_score')::float, 0.5) ASC`,
              [learnerId]
            ),
          ]);
          if (learnerResult.rows && learnerResult.rows[0]) {
            const row = learnerResult.rows[0];
            learnerName = row.name || null;
            learnerCefr = row.cefr_level || null;
            nativeLanguage = row.mother_tongue ? langToIso(row.mother_tongue) : null;
            isFirstSession = parseInt(row.session_count, 10) === 0;
          }
          if (lastEpisodeResult.rows && lastEpisodeResult.rows[0]) {
            lastEpisode = lastEpisodeResult.rows[0];
          }
          if (brainResult.rows && brainResult.rows.length > 0) {
            brainNodes = brainResult.rows.map((r) => ({
              label: r.label,
              type: r.type,
              confidence: r.confidence_score != null ? r.confidence_score : 0.5,
              metadata: r.metadata || {},
            }));
          }
        } catch (err) {
          console.error('[voice] Could not fetch learner profile:', err.message);
        }
      }

      const systemPrompt = getSystemPrompt({
        mode,
        dashboardMode,
        topic,
        reviewWords,
        focusTopics,
        writingSample,
        learnerCefr,
        nativeLanguage,
        learnerName,
        lastEpisode,
        brainNodes,
        isFirstSession,
      });

      const createResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-realtime-1.5',
          voice: 'verse',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          instructions: systemPrompt,
        }),
      });

      if (!createResp.ok) {
        console.error('[voice] Session create failed');
        sendError(res, 500);
        return;
      }

      const { id: sessionId } = await createResp.json();
      const apiUrl = `https://api.openai.com/v1/realtime?model=gpt-realtime-1.5&session=${encodeURIComponent(sessionId)}`;
      const oaiResp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
        body: offerSdp,
      });

      if (!oaiResp.ok) {
        console.error('[voice] SDP exchange failed');
        sendError(res, 500);
        return;
      }

      const answerSdp = await oaiResp.text();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      });
      res.end(JSON.stringify({ answer: answerSdp, instructions: systemPrompt }));
    } catch (err) {
      console.error('[voice]', err);
      sendError(res, 500);
    }
    return true;
  }

  return false;
}

async function handleApi(pathname, req, res, body) {
  const base = '/api';
  if (!pathname.startsWith(base)) return false;

  const path = pathname.slice(base.length) || '/';
  const [route] = path.split('/').filter(Boolean);

  const wrappedReq = {
    method: req.method,
    headers: req.headers,
    body: body ? (() => { try { return JSON.parse(body); } catch { return {}; } })() : {},
    user: null,
  };

  if (route === 'auth') {
    const authLimit = checkLimit(getClientIp(req), 'auth', LIMITS.auth);
    if (!authLimit.ok) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(authLimit.retryAfter || 900) });
      res.end(JSON.stringify({ error: 'Too many requests' }));
      return true;
    }
    const pathSegs = path.split('/').filter(Boolean);
    if (pathSegs[1] === 'register') {
      await registerHandler(wrappedReq, res);
    } else {
      await authHandler(wrappedReq, res);
    }
    return true;
  }
  if (route === 'health') {
    try {
      const [nodes, edges, episodes, learners] = await Promise.all([
        query('SELECT COUNT(*) FROM brain_nodes'),
        query('SELECT COUNT(*) FROM brain_edges'),
        query('SELECT COUNT(*) FROM episodes'),
        query('SELECT COUNT(*) FROM learners'),
      ]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        counts: {
          brain_nodes: parseInt(nodes.rows[0]?.count || 0),
          brain_edges: parseInt(edges.rows[0]?.count || 0),
          episodes: parseInt(episodes.rows[0]?.count || 0),
          learners: parseInt(learners.rows[0]?.count || 0),
        },
      }));
    } catch (err) {
      console.error('health:', err);
      sendError(res, 500);
    }
    return true;
  }
  if (route === 'schema-check') {
    try {
      const cols = await query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('episodes', 'brain_nodes') AND column_name = 'metadata'`);
      const hasEpisodes = cols.rows.some((r) => r.table_name === 'episodes');
      const hasBrainNodes = cols.rows.some((r) => r.table_name === 'brain_nodes');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        episodes_has_metadata: hasEpisodes,
        brain_nodes_has_metadata: hasBrainNodes,
        fix: !hasEpisodes || !hasBrainNodes
          ? "Run in Neon SQL Editor: ALTER TABLE episodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'; ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';"
          : null,
      }));
    } catch (err) {
      console.error('schema-check:', err);
      sendError(res, 500);
    }
    return true;
  }
  if (route === 'cron-weekly') {
    await weeklyEmailHandler(req, res);
    return true;
  }
  if (route === 'yki-score') {
    const token = getTokenFromRequest(req);
    const user = token ? verifyToken(token) : null;
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }
    wrappedReq.user = user;
    await ykiScoreHandler(wrappedReq, res);
    return true;
  }

  const token = getTokenFromRequest(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }));
    return true;
  }
  wrappedReq.user = user;

  try {
    if (route === 'teacher') {
      const pathSegs = path.split('/').filter(Boolean);
      if (pathSegs[1] === 'learners' && req.method === 'GET') {
        await getLearnersHandler(wrappedReq, res);
        return true;
      }
      if (pathSegs[1] === 'nudge' && pathSegs[2] && req.method === 'POST') {
        await nudgeHandler(wrappedReq, res, pathSegs[2]);
        return true;
      }
      res.writeHead(404);
      res.end();
      return true;
    }
    if (route === 'teacher-override' && req.method === 'POST') {
      await teacherCefrOverrideHandler(wrappedReq, res);
      return true;
    }
    if (route === 'learners') {
      const pathSegs = path.split('/').filter(Boolean);
      if (pathSegs[2] === 'reviewed') {
        await teacherOverrideHandler(wrappedReq, res, pathname);
        return true;
      }
      await learnersHandler(wrappedReq, res, pathname);
      return true;
    }
    if (route === 'brain') {
      const pathSegs = path.split('/').filter(Boolean);
      const sub = pathSegs[1];
      if (sub === 'skills') { await brainSkillsHandler(wrappedReq, res); return true; }
      if (sub === 'stats') { await brainStatsHandler(wrappedReq, res); return true; }
      if (sub === 'sessions') { await brainSessionsHandler(wrappedReq, res); return true; }
      await brainHandler(wrappedReq, res);
      return true;
    }
    if (route === 'agents') {
      const pathSegs = path.split('/').filter(Boolean);
      if (req.method === 'POST' && pathSegs[1] && pathSegs[2] === 'prompt') {
        await agentPromptHandler(wrappedReq, res, pathSegs[1]);
        return true;
      }
      await agentsHandler(wrappedReq, res);
      return true;
    }
    if (route === 'session-complete') {
      await sessionCompleteHandler(wrappedReq, res);
      return true;
    }
    if (route === 'session-focus') {
      await sessionFocusHandler(wrappedReq, res);
      return true;
    }
    if (route === 'save-card') {
      await saveCardHandler(wrappedReq, res);
      return true;
    }
    if (route === 'user-data') {
      const sub = path.split('/').filter(Boolean)[1] || '';
      await userDataHandler(wrappedReq, res, '/api/user-data/' + sub);
      return true;
    }
    if (route === 'leads') {
      const pathSegs = path.split('/').filter(Boolean);
      if (req.method === 'GET' && !pathSegs[1]) {
        await getLeadsHandler(wrappedReq, res);
        return true;
      }
      if (req.method === 'PATCH' && pathSegs[1]) {
        await patchLeadHandler(wrappedReq, res, pathSegs[1]);
        return true;
      }
      res.writeHead(404);
      res.end();
      return true;
    }
  } catch (err) {
    console.error('[api]', err);
    sendError(res, 500);
    return true;
  }

  res.writeHead(404).end();
  return true;
}

const server = createServer(async (req, res) => {
  setSecurityHeaders(req, res);
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const ip = getClientIp(req);
  const pathRoute = pathname.startsWith('/api') ? (pathname.split('/')[2] || 'api') : 'api';
  const limitPath = pathRoute === 'auth' ? 'auth' : 'api';
  const limit = checkLimit(ip, limitPath, LIMITS[limitPath]);
  if (!limit.ok) {
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(limit.retryAfter || 900) });
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return;
  }

  const voiceHandled = await handleVoice(pathname, req, res);
  if (voiceHandled) return;

  let body = '';
  if ((req.method === 'POST' || req.method === 'PATCH') && pathname.startsWith('/api')) {
    body = await collectBody(req);
  }

  const apiHandled = await handleApi(pathname, req, res, body);
  if (apiHandled) return;

  const routeRewrites = { '/quiz': 'quiz.html', '/writing': 'writing.html', '/learn': 'learn.html' };
  const staticPath = routeRewrites[pathname] || pathname;
  if (!serveStatic(staticPath, res)) {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  SuvisBrain running at http://localhost:${PORT}\n`);
  if (!process.env.DATABASE_URL) console.log('  ⚠ DATABASE_URL not set — Brain/Agents API will fail.\n');
  if (!process.env.OPENAI_API_KEY) console.log('  ⚠ OPENAI_API_KEY not set — Voice (Knuut) will fail.\n');
  if (!process.env.OPENROUTER_API_KEY) console.log('  ⚠ OPENROUTER_API_KEY not set — session-complete will fail.\n');
});
