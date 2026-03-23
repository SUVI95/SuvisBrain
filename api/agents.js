/**
 * Vercel Serverless API: Agents
 * GET /api/agents → list all agents
 */

import { sql } from '../src/lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'DATABASE_URL not configured. Add it in .env or Vercel env vars.',
    });
  }

  try {
    const rows = await sql`
      select id, name, role, color, status, tick, created_at
      from agents
      order by name asc
    `;
    return res.status(200).json(rows);
  } catch (err) {
    console.error('[api/agents]', err);
    return res.status(500).json({
      error: err.message || 'Database error',
    });
  }
}
