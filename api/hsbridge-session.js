// POST /session — Legacy HSBridge / Framer embed (raw SDP in, raw SDP out).
// Matches old knuut-ai-demo-page.onrender.com/session contract for minimal Framer edits.

import { exchangePublicKnuutVoice } from './duunijobs-session.js';

function isSdpContentType(req) {
  const ct = String(req.headers?.['content-type'] || req.headers?.['Content-Type'] || '').toLowerCase();
  return ct.includes('application/sdp') || ct.includes('text/plain');
}

export function extractOfferSdp(req, body, rawBody) {
  if (body && body.sdp) return String(body.sdp);
  const raw = String(rawBody || '').trim();
  if (raw.startsWith('v=0')) return raw;
  if (isSdpContentType(req) && raw) return raw;
  return '';
}

export default async function handler(req, res, body, rawBody) {
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
