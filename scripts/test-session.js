#!/usr/bin/env node
/**
 * Simulate a completed Knuut session by calling session-complete directly.
 * Usage: node scripts/test-session.js
 *
 * Requires: server running (npm run dev) and teacher credentials set.
 */
import 'dotenv/config';

const BASE = 'http://localhost:3000';

const BODY = {
  learner_id: null,
  agent_id: null,
  transcript: "Student practiced saying hello in Finnish. Said 'hei' and 'moi' correctly. Struggled with partitive case. Tried numbers 1-10, got most right. Teacher introduced workplace vocabulary - words like 'työ' and 'toimisto'. Student has not encountered vowel harmony before.",
  duration_s: 420,
  language: 'fi',
};

async function main() {
  let token = null;
  try {
    const authRes = await fetch(`${BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@knuut.fi', password: 'demo123' }),
    });
    const authData = await authRes.json();
    if (authData.token) token = authData.token;
  } catch (e) {
    console.warn('Auth failed (server may be down):', e.message);
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api/session-complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify(BODY),
    });
  } catch (e) {
    console.error('Request failed:', e.message);
    console.error('Make sure the server is running: npm run dev');
    process.exit(1);
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
