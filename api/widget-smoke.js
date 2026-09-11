// GET /api/widget-smoke — Public readiness check for the Knuut embed widget (no auth, no DB).
// ?deep=1 also validates OpenAI Realtime client_secrets (uses a small API call).

import {
  checkRealtimeClientSecrets,
  getWebRtcClientHints,
  isVoiceProviderConfigured,
} from '../src/lib/realtime-voice.js';

const DUUNIJOBS_CAP_SECONDS = 120;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const url = req.url || '';
  const deep = /[?&]deep=1(?:&|$)/.test(url) || /[?&]deep=true(?:&|$)/i.test(url);

  const voiceConfigured = isVoiceProviderConfigured();
  const hints = getWebRtcClientHints();

  const checks = {
    voice_configured: voiceConfigured,
    realtime_hints: hints,
    duunijobs_session_route: 'POST /api/duunijobs-session',
    cap_seconds: DUUNIJOBS_CAP_SECONDS,
  };

  if (deep && voiceConfigured) {
    checks.realtime_client_secrets = await checkRealtimeClientSecrets();
  } else if (deep) {
    checks.realtime_client_secrets = { ok: false, reason: 'OPENAI_API_KEY not set' };
  }

  const secretsOk = !deep || (checks.realtime_client_secrets && checks.realtime_client_secrets.ok);
  const ok = voiceConfigured && secretsOk;

  res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok,
    service: 'knuut-widget',
    checks,
    embed: {
      html: '<div id="knuut-widget" data-api-base="YOUR_API_ORIGIN"></div><script src="YOUR_API_ORIGIN/knuut-widget.js"></script>',
      default_api_base: 'https://suvisbrain.vercel.app',
    },
  }));
}
