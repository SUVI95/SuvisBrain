// GET /api/brain/skills — learned vocabulary/cards for authenticated learner
import { query } from './db.js';

export default async function brainSkillsHandler(req, res) {
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
      `SELECT label, type, metadata,
              (metadata->>'confidence_score')::float as confidence_score
       FROM brain_nodes
       WHERE type = 'Skill'
         AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
         AND metadata->>'source' = 'interactive_card'
       ORDER BY updated_at DESC`,
      [learnerId]
    );

    const skills = (result.rows || []).map((r) => {
      const m = r.metadata || {};
      return {
        word: r.label,
        translation_hint: m.translation_hint || '',
        user_answer: m.user_answer || '',
        correct: m.correct === true || m.correct === 'true',
        type: m.card_type || 'word',
        repetition_count: m.repetition_count || 1,
        confidence: r.confidence_score != null ? r.confidence_score : 0.5,
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(skills));
  } catch (err) {
    console.error('brain/skills error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
