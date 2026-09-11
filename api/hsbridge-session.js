// POST /api/hsbridge-session and POST /session (via vercel rewrite)
// Legacy HSBridge / Framer embed — raw SDP in, raw SDP out.

import { exchangePublicKnuutVoice } from './duunijobs-session.js';

export const config = { api: { bodyParser: false } };

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function isSdpContentType(req) {
  const ct = String(req.headers?.['content-type'] || req.headers?.['Content-Type'] || '').toLowerCase();
  return ct.includes('application/sdp') || ct.includes('text/plain');
}

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object' && req.body.sdp) return String(req.body.sdp);
  if (typeof req.text === 'function') {
    try {
      return await req.text();
    } catch (e) {
      return '';
    }
  }
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => resolve(''));
  });
}

export function extractOfferSdp(req, body, rawBody) {
  if (body && body.sdp) return String(body.sdp);
  const raw = String(rawBody || '').trim();
  if (raw.startsWith('v=0')) return raw;
  if (isSdpContentType(req) && raw) return raw;
  return '';
}

async function handleHsbridgeSession(req, res, body, rawBody) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const offerSdp = extractOfferSdp(req, body, rawBody);
    let realtimeResult;
    try {
      realtimeResult = await exchangePublicKnuutVoice(offerSdp);
    } catch (voiceErr) {
      const msg = voiceErr.message || String(voiceErr);
      console.error('[hsbridge-session]', msg);
      const code = voiceErr.statusCode >= 400 && voiceErr.statusCode < 600 ? voiceErr.statusCode : 500;
      res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(msg.slice(0, 800));
      return;
    }

    const headers = { 'Content-Type': 'application/sdp' };
    if (realtimeResult.sessionId) headers['X-Session-Id'] = realtimeResult.sessionId;
    res.writeHead(200, headers);
    res.end(realtimeResult.answerSdp);
  } catch (err) {
    console.error('[hsbridge-session]', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Something went wrong');
  }
}

/** Vercel / standalone entry */
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const rawBody = req.method === 'POST' ? await readRawBody(req) : '';
  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch (e) {
    body = {};
  }
  await handleHsbridgeSession(req, res, body, rawBody);
}
