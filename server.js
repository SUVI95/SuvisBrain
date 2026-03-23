/**
 * Local dev server — serves static files + API routes
 * Run: node server.js
 */

import 'dotenv/config';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

async function handleApi(pathname, req, res) {
  const base = '/api';
  if (!pathname.startsWith(base)) return false;

  const path = pathname.slice(base.length) || '/';
  const [route] = path.split('/').filter(Boolean);

  try {
    if (route === 'brain') {
      const { getBrainGraph, createNode } = await import('./src/api/memory.js');
      if (req.method === 'GET') {
        const graph = await getBrainGraph();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(graph));
      }
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        const { label, type, agentId, metadata } = JSON.parse(body || '{}');
        if (!label || !type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing label, type' }));
        }
        const node = await createNode({ label, type, agentId: agentId || null, metadata: metadata || {} });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(node));
      }
      res.writeHead(405).end();
      return true;
    }
    if (route === 'agents') {
      const { sql } = await import('./src/lib/db.js');
      const rows = await sql`select id, name, role, color, status, tick, created_at from agents order by name asc`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(rows));
    }
  } catch (err) {
    console.error('[api]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: err.message }));
  }

  res.writeHead(404).end();
  return true;
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

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  const handled = await handleApi(pathname, req, res);
  if (handled) return;

  if (!serveStatic(pathname, res)) {
    res.writeHead(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  SuvisBrain running at http://localhost:${PORT}\n`);
  if (!process.env.DATABASE_URL) {
    console.log('  ⚠ DATABASE_URL not set — API will fail. Add it to .env\n');
  }
});
