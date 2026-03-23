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

  if (pathname === '/session' && req.method === 'POST') {
    try {
      if (!process.env.OPENAI_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Missing OPENAI_API_KEY');
      }
      const contentType = req.headers['content-type'] || '';
      const body = await collectBody(req);
      const offerSdp = contentType.includes('json') ? (JSON.parse(body || '{}').sdp || '') : body;
      if (!offerSdp) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Missing SDP offer');
      }

      const focusFragment = req.headers['x-session-focus'] || '';
      const examMode = (req.headers['x-exam-mode'] || '').toLowerCase() === 'true';

      const LANG_TEACHER_PROMPT = examMode
        ? `You are now running a YKI (Yleinen kielitutkinto) B1 level mock exam.
Strictly follow these rules:

1. SPEAKING SECTION (5 minutes):
   Give the learner 2 speaking tasks typical of YKI B1:
   - Task 1: Describe a situation (e.g. "You need to call a doctor. Explain your symptoms in Finnish.")
   - Task 2: Give an opinion (e.g. "What do you think about public transport in Finnish cities?")
   Assess: fluency, vocabulary range, grammatical accuracy, pronunciation.

2. INTERACTION SECTION (5 minutes):
   Role-play a realistic Finnish conversation scenario:
   - e.g. Renting an apartment, job interview, pharmacy visit
   Respond naturally as the other person in the scenario.
   Gently correct major errors by repeating correctly.

3. FEEDBACK SECTION (5 minutes):
   After the exam tasks, give structured feedback:
   - Overall CEFR level demonstrated: A1 / A2 / B1 / B2
   - Strongest area
   - Biggest weakness
   - 3 specific things to practice before the real exam
   - Predicted YKI score: Fail / Pass / Pass with distinction

Do NOT break character during the exam sections.
Do NOT switch to English unless the learner is completely lost.
Keep strict time — move to the next section after 5 minutes.
${focusFragment ? '\n' + focusFragment : ''}`
        : `You are Knuut, a friendly, patient language teacher who can speak and teach ANY language. You adapt to the user's target language immediately.

CRITICAL: NEVER speak while the user speaks. Wait until they fully stop. After they stop, pause 1 second before responding. Keep responses SHORT — max 2-3 sentences. Never monologue.

YOUR ROLE:
- Speak the same language the user is learning (or the one they request)
- Correct gently: repeat the right form without shaming
- Encourage: "Hyvä!" "Bra!" "Good!" etc.
- Ask simple follow-up questions to practice
- Use clear, natural speech at a learner-friendly pace

CONVERSATION FLOW:
1. Greet warmly in the target language (ask which language if unclear)
2. Practice: basic phrases, vocabulary, or free conversation
3. Correct errors kindly: "Almost! We say [correct form]"
4. Keep turns short so the user practices speaking

NEVER: Speak over the user, give long grammar lessons, use complex vocabulary, rush. You are calm, warm, patient, and human-like.${focusFragment ? '\n\n' + focusFragment : ''}`;

      const createResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: 'verse',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          instructions: LANG_TEACHER_PROMPT,
        }),
      });

      if (!createResp.ok) {
        const err = await createResp.text();
        console.error('[voice] Session create failed:', err.slice(0, 200));
        res.writeHead(createResp.status, { 'Content-Type': 'text/plain' });
        return res.end(err);
      }

      const { id: sessionId } = await createResp.json();
      const apiUrl = `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview&session=${encodeURIComponent(sessionId)}`;
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
        'Content-Type': 'application/sdp',
        'X-Session-Id': sessionId,
      });
      res.end(answerSdp);
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
