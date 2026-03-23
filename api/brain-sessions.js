// GET /api/brain/sessions — past sessions for authenticated learner
import { query } from './db.js';

export default async function brainSessionsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'GET only' }));
  }
  const user = req.user;
  if (!user || user.role !== 'learner') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }
  const learnerId = user.id;

  try {
    const result = await query(
      `SELECT id, title, summary, duration_s, created_at, metadata
       FROM episodes
       WHERE learner_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [learnerId]
    );

    const sessions = (result.rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      duration_s: r.duration_s,
      created_at: r.created_at,
      is_yki: !!(r.metadata && (r.metadata.is_yki_exam || r.metadata.yki_score)),
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(sessions));
  } catch (err) {
    console.error('brain/sessions error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
