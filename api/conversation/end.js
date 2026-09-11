// POST /api/conversation/end — Legacy transcript webhook from HSBridge Framer embed.

import conversationEndHandler from '../conversation-end.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  if (typeof req.json === 'function') {
    try {
      return await req.json();
    } catch (e) {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const body = req.method === 'POST' ? await readJsonBody(req) : {};
  await conversationEndHandler(
    { method: req.method, headers: req.headers || {} },
    res,
    body
  );
}
