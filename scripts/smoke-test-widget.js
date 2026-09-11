#!/usr/bin/env node
/**
 * Smoke test for the Knuut embed widget API (Duunijobs / HSBridge sites).
 *
 * Usage:
 *   node scripts/smoke-test-widget.js
 *   node scripts/smoke-test-widget.js --base https://suvisbrain.vercel.app
 *   node scripts/smoke-test-widget.js --deep
 */
import 'dotenv/config';

const args = process.argv.slice(2);
const deep = args.includes('--deep');
const baseIdx = args.indexOf('--base');
const BASE = (baseIdx >= 0 && args[baseIdx + 1])
  ? args[baseIdx + 1].replace(/\/$/, '')
  : (process.env.SMOKE_BASE || 'http://localhost:3000').replace(/\/$/, '');

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { res, data, url };
}

async function main() {
  console.log(`\nKnuut widget smoke test → ${BASE}\n`);

  // 1. Realtime client hints (widget calls this first)
  try {
    const { res, data } = await fetchJson('/api/realtime-client-hints');
    if (res.ok && data.dataChannelLabel === 'oai-events' && data.provider === 'openai') {
      pass('GET /api/realtime-client-hints', `provider=${data.provider}`);
    } else {
      fail('GET /api/realtime-client-hints', `HTTP ${res.status} ${JSON.stringify(data).slice(0, 120)}`);
    }
  } catch (e) {
    fail('GET /api/realtime-client-hints', e.message);
  }

  // 2. Widget smoke endpoint
  try {
    const path = deep ? '/api/widget-smoke?deep=1' : '/api/widget-smoke';
    const { res, data } = await fetchJson(path);
    if (res.status === 404) {
      fail('GET /api/widget-smoke', 'route not deployed yet — use --base after deploy or run npm run dev locally');
    } else if (data.ok) {
      pass('GET /api/widget-smoke', deep ? 'voice + client_secrets ok' : 'voice configured');
    } else if (data.checks?.voice_configured === false) {
      fail('GET /api/widget-smoke', 'OPENAI_API_KEY not set on server');
    } else if (deep && data.checks?.realtime_client_secrets && !data.checks.realtime_client_secrets.ok) {
      fail('GET /api/widget-smoke (deep)', data.checks.realtime_client_secrets.reason || 'client_secrets failed');
    } else {
      fail('GET /api/widget-smoke', `HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
    }
  } catch (e) {
    fail('GET /api/widget-smoke', e.message);
  }

  // 3. duunijobs-session rejects empty body (proves route + CORS handler exist)
  try {
    const { res, data } = await fetchJson('/api/duunijobs-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.status === 400 && data.error === 'Missing SDP offer') {
      pass('POST /api/duunijobs-session (no SDP)', 'returns 400 as expected');
    } else if (res.status === 500 && data.error === 'Voice not available') {
      fail('POST /api/duunijobs-session (no SDP)', 'OPENAI_API_KEY not set on server');
    } else {
      fail('POST /api/duunijobs-session (no SDP)', `HTTP ${res.status} ${JSON.stringify(data).slice(0, 120)}`);
    }
  } catch (e) {
    fail('POST /api/duunijobs-session (no SDP)', e.message);
  }

  // 4. CORS preflight for embed on third-party origin
  try {
    const { res } = await fetchJson('/api/duunijobs-session', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://hsbridge.ai',
        'Access-Control-Request-Method': 'POST',
      },
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if ((res.status === 204 || res.status === 200) && allowOrigin) {
      pass('OPTIONS /api/duunijobs-session (CORS)', `Allow-Origin: ${allowOrigin}`);
    } else {
      fail('OPTIONS /api/duunijobs-session (CORS)', `HTTP ${res.status}, Allow-Origin: ${allowOrigin || 'missing'}`);
    }
  } catch (e) {
    fail('OPTIONS /api/duunijobs-session (CORS)', e.message);
  }

  // 5. Legacy HSBridge /session route (Framer embed)
  try {
    const { res } = await fetchJson('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp', Origin: 'https://www.hsbridgeai.fi' },
      body: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
    });
    if (res.status === 400 || res.status === 500) {
      pass('POST /session (legacy Framer)', `route reachable (HTTP ${res.status}, invalid SDP expected without WebRTC)`);
    } else if (res.status === 404) {
      fail('POST /session (legacy Framer)', 'route not deployed — merge hsbridge-session + vercel.json routes');
    } else {
      pass('POST /session (legacy Framer)', `HTTP ${res.status}`);
    }
  } catch (e) {
    fail('POST /session (legacy Framer)', e.message);
  }

  // 6. Static widget assets
  for (const asset of ['/knuut-widget.js', '/duunijobs-knuut.html']) {
    try {
      const res = await fetch(`${BASE}${asset}`);
      if (res.ok) pass(`GET ${asset}`, `HTTP ${res.status}`);
      else fail(`GET ${asset}`, `HTTP ${res.status}`);
    } catch (e) {
      fail(`GET ${asset}`, e.message);
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
  if (failed.length) {
    console.log('Failed:');
    failed.forEach((r) => console.log(`  - ${r.name}: ${r.detail || ''}`));
    console.log('');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
