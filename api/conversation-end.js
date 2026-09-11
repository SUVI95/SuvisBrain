// POST /api/conversation/end — Legacy transcript webhook from HSBridge Framer embed.

export default async function handler(req, res, body) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const sessionId = body?.sessionId ? String(body.sessionId) : null;
    const source = body?.source ? String(body.source) : 'unknown';
    const durationSeconds = Number.isFinite(body?.durationSeconds) ? body.durationSeconds : null;
    const transcript = body?.transcript ? String(body.transcript) : '';
    if (transcript || sessionId) {
      console.log('[conversation-end]', {
        sessionId,
        source,
        durationSeconds,
        transcriptChars: transcript.length,
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('[conversation-end]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Something went wrong' }));
  }
}
