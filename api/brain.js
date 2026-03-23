// api/brain.js — GET/POST brain nodes and edges
import { query } from './db.js';

export default async function brainHandler(req, res) {
  if (req.method === 'GET') {
    try {
      const [nodesResult, edgesResult, lastEpisode] = await Promise.all([
        query(
          `SELECT id, label, type, metadata,
                  (metadata->>'confidence_score')::float as confidence_score
           FROM brain_nodes ORDER BY created_at DESC`
        ),
        query(
          `SELECT be.id, n1.label as source, n2.label as target, be.value
           FROM brain_edges be
           JOIN brain_nodes n1 ON n1.id = be.source_id
           JOIN brain_nodes n2 ON n2.id = be.target_id`
        ),
        query('SELECT created_at FROM episodes ORDER BY created_at DESC LIMIT 1'),
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          last_session: (lastEpisode.rows[0] && lastEpisode.rows[0].created_at) || null,
          nodes: nodesResult.rows.map((r) => ({
            id: r.label,
            type: r.type,
            confidence_score: r.confidence_score != null ? r.confidence_score : 0.5,
            db_id: r.id,
            ...(r.metadata || {}),
          })),
          links: edgesResult.rows.map((r) => ({
            source: r.source,
            target: r.target,
            value: r.value != null ? r.value : 1,
          })),
        })
      );
    } catch (err) {
      console.error('GET /api/brain error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST') {
    const { label, type, agent_id } = req.body || {};
    if (!label || !type) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing label or type' }));
      return;
    }

    try {
      const nodeResult = await query(
        `INSERT INTO brain_nodes (label, type, agent_id, metadata)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [label, type, agent_id != null ? agent_id : null, JSON.stringify({ confidence_score: 0.5 })]
      );
      const newId = nodeResult.rows[0].id;

      const coreResult = await query(
        `SELECT id FROM brain_nodes WHERE type = 'Core' LIMIT 1`
      );
      if (coreResult.rows.length > 0) {
        await query(
          `INSERT INTO brain_edges (source_id, target_id, value)
           VALUES ($1, $2, 1)`,
          [coreResult.rows[0].id, newId]
        );
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, id: newId }));
    } catch (err) {
      console.error('POST /api/brain error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(405).end();
}
