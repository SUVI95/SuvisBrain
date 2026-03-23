// GET /api/brain/skills — learned vocabulary/cards for authenticated learner
import { query } from './db.js';

function sendJson(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function brainSkillsHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'GET only' });
  }

  const user = req.user;
  if (!user || user.role !== 'learner') {
    return sendJson(res, 401, { error: 'Unauthorized' });
  }

  const learnerId = String(user.id || '').trim();
  if (!learnerId) {
    return sendJson(res, 400, { error: 'Missing learner id' });
  }

  try {
    const result = await query(
      `SELECT label, type, metadata,
              (metadata->>'confidence_score')::float as confidence_score
       FROM brain_nodes
       WHERE type = 'Skill'
         AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
         AND (metadata->>'source' = 'interactive_card' OR metadata ? 'user_answer')
       ORDER BY updated_at DESC`,
      [learnerId]
    );

    const rows = result && result.rows ? result.rows : [];
    const skills = rows.map((r) => {
      const m = r.metadata || {};
      return {
        word: r.label || '',
        translation_hint: m.translation_hint || '',
        user_answer: m.user_answer || '',
        correct: m.correct === true || m.correct === 'true',
        type: m.card_type || 'word',
        repetition_count: m.repetition_count || 1,
        confidence: r.confidence_score != null ? r.confidence_score : 0.5,
      };
    });

    return sendJson(res, 200, skills);
  } catch (err) {
    console.error('brain/skills error:', err);
    return sendJson(res, 500, { error: err.message || 'Server error' });
  }
}
