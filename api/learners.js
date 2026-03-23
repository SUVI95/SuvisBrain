// api/learners.js — GET /api/learners, GET /api/learners/:id/progress
import { query } from './db.js';

export default async function learnersHandler(req, res, pathname) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const match = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/progress$/);
  const learnerId = match ? match[1] : null;

  if (req.method === 'GET' && !learnerId) {
    if (req.user?.role !== 'teacher') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Teacher access required' }));
      return;
    }
    try {
      const result = await query(`
        SELECT l.*,
               COUNT(DISTINCT e.id)::int as session_count,
               MAX(e.created_at) as last_session
        FROM learners l
        LEFT JOIN episodes e ON e.learner_id = l.id
        GROUP BY l.id
        ORDER BY l.created_at ASC
      `);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows));
      return;
    } catch (err) {
      console.error('GET /api/learners error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  if (req.method === 'GET' && learnerId) {
    if (req.user?.role === 'learner' && req.user?.id !== learnerId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Can only view own progress' }));
      return;
    }
    try {
      const [learnerResult, nodesResult, episodesResult] = await Promise.all([
        query(`SELECT * FROM learners WHERE id = $1`, [learnerId]),
        query(`
          SELECT label, type,
                 (metadata->>'confidence_score')::float as confidence,
                 COALESCE(confidence_history, '[]'::jsonb) as confidence_history
          FROM brain_nodes
          WHERE type IN ('Skill','Memory')
          ORDER BY COALESCE((metadata->>'confidence_score')::float, 0.5) ASC
        `),
        query(
          `SELECT title, summary, duration_s, created_at
           FROM episodes
           WHERE learner_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [learnerId]
        ),
      ]);

      if (learnerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Learner not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          learner: learnerResult.rows[0],
          nodes: nodesResult.rows,
          episodes: episodesResult.rows,
        })
      );
    } catch (err) {
      console.error('GET /api/learners/:id/progress error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(405).end();
}
