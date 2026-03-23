/**
 * SuvisBrain dev server — static files + API routes + voice
 * Run: node server.js
 */

import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

import { getTokenFromRequest, verifyToken } from './src/lib/auth.js';
import brainHandler from './api/brain.js';
import agentsHandler from './api/agents.js';
import sessionCompleteHandler from './api/session-complete.js';
import sessionFocusHandler from './api/session-focus.js';
import learnersHandler from './api/learners.js';
import authHandler from './api/auth.js';
import weeklyEmailHandler from './api/cron-weekly.js';
import ykiScoreHandler from './api/yki-score.js';
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
      if (!process.env.OPENAI_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Missing OPENAI_API_KEY');
      }
      const contentType = req.headers['content-type'] || '';
      const rawBody = await collectBody(req);
      const body = contentType.includes('json') ? (JSON.parse(rawBody || '{}') || {}) : {};
      const offerSdp = body.sdp || rawBody;
      if (!offerSdp) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Missing SDP offer');
      }

      const learnerId = body.learner_id || null;
      const mode = (body.mode || '').toLowerCase() === 'yki' ? 'yki' : 'regular';
      const focusTopics = Array.isArray(body.focusTopics) ? body.focusTopics : [];

      let learnerCefr = null;
      let nativeLanguage = null;
      let isFirstSession = false;

      if (learnerId) {
        try {
          const learnerResult = await query(
            `SELECT cefr_level, mother_tongue,
                    (SELECT COUNT(*) FROM episodes WHERE learner_id = $1) AS session_count
             FROM learners WHERE id = $2`,
            [learnerId, learnerId]
          );
          if (learnerResult.rows && learnerResult.rows[0]) {
            const row = learnerResult.rows[0];
            learnerCefr = row.cefr_level || null;
            nativeLanguage = row.mother_tongue ? langToIso(row.mother_tongue) : null;
            isFirstSession = parseInt(row.session_count, 10) === 0;
          }
        } catch (err) {
          console.error('[voice] Could not fetch learner profile:', err.message);
        }
      }

      const systemPrompt = getSystemPrompt({
        mode,
        focusTopics,
        learnerCefr,
        nativeLanguage,
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
          voice: 'cedar',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          instructions: systemPrompt,
        }),
      });

      if (!createResp.ok) {
        const err = await createResp.text();
        console.error('[voice] Session create failed:', err.slice(0, 200));
        res.writeHead(createResp.status, { 'Content-Type': 'text/plain' });
        return res.end(err);
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
        const err = await oaiResp.text();
        console.error('[voice] SDP exchange failed:', err.slice(0, 200));
        res.writeHead(oaiResp.status, { 'Content-Type': 'text/plain' });
        return res.end(err);
      }

      const answerSdp = await oaiResp.text();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
      });
      res.end(JSON.stringify({ answer: answerSdp, instructions: systemPrompt }));
    } catch (err) {
      console.error('[voice]', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
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
    await authHandler(wrappedReq, res);
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
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'db_error', error: err.message }));
    }
    return true;
  }
  if (route === 'cron-weekly') {
    await weeklyEmailHandler(req, res);
    return true;
  }
  if (route === 'yki-score') {
    if (req.method === 'GET') {
      await ykiScoreHandler(req, res);
      return true;
    }
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
    if (route === 'learners') {
      await learnersHandler(wrappedReq, res, pathname);
      return true;
    }
    if (route === 'brain') {
      await brainHandler(wrappedReq, res);
      return true;
    }
    if (route === 'agents') {
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
  } catch (err) {
    console.error('[api]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
    return true;
  }

  res.writeHead(404).end();
  return true;
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  const voiceHandled = await handleVoice(pathname, req, res);
  if (voiceHandled) return;

  let body = '';
  if (req.method === 'POST' && pathname.startsWith('/api')) {
    body = await collectBody(req);
  }

  const apiHandled = await handleApi(pathname, req, res, body);
  if (apiHandled) return;

  if (!serveStatic(pathname, res)) {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  SuvisBrain running at http://localhost:${PORT}\n`);
  if (!process.env.DATABASE_URL) console.log('  ⚠ DATABASE_URL not set — Brain/Agents API will fail.\n');
  if (!process.env.OPENAI_API_KEY) console.log('  ⚠ OPENAI_API_KEY not set — Voice (Knuut) will fail.\n');
  if (!process.env.OPENROUTER_API_KEY) console.log('  ⚠ OPENROUTER_API_KEY not set — session-complete will fail.\n');
});
