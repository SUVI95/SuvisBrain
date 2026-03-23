// Vercel serverless: GET /api/learners/:id/progress
import { query } from '../../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { id: learnerId } = req.query;

  if (req.method !== 'GET' || !learnerId) {
    res.status(405).json({ error: 'GET required with learner id' });
    return;
  }

  try {
    const [learnerResult, nodesResult, episodesResult] = await Promise.all([
      query(`SELECT * FROM learners WHERE id = $1`, [learnerId]),
      query(
        `SELECT label, type,
                (metadata->>'confidence_score')::float as confidence
         FROM brain_nodes
         WHERE type IN ('Skill','Memory')
           AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
         ORDER BY COALESCE((metadata->>'confidence_score')::float, 0.5) ASC`,
        [learnerId]
      ),
      query(`
        SELECT title, summary, duration_s, created_at
        FROM episodes
        WHERE learner_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    if (learnerResult.rows.length === 0) {
      res.status(404).json({ error: 'Learner not found' });
      return;
    }

    res.status(200).json({
      learner: learnerResult.rows[0],
      nodes: nodesResult.rows,
      episodes: episodesResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
