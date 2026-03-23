// api/agents.js — GET agents from Neon with episode/node counts
import { query } from './db.js';

export default async function agentsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    try {
      const result = await query(`
        SELECT 
          a.id,
          a.name,
          a.role,
          a.color,
          a.status,
          a.tick,
          COUNT(DISTINCT e.id)::int as episode_count,
          COUNT(DISTINCT bn.id)::int as node_count,
          MAX(e.created_at) as last_active
        FROM agents a
        LEFT JOIN episodes e ON e.agent_id = a.id
        LEFT JOIN brain_nodes bn ON bn.agent_id = a.id
        GROUP BY a.id, a.name, a.role, a.color, a.status, a.tick
        ORDER BY a.name ASC
      `);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ agents: result.rows }));
    } catch (err) {
      console.error('GET /api/agents error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(405).end();
}
