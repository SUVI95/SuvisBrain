// POST /api/save-card — save interactive learning card to brain
import { query } from './db.js';

export default async function saveCardHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  try {
    const user = req.user;
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const { word, answer, translation_hint, type, learner_id, correct } = req.body || {};
    if (!word || typeof word !== 'string' || !word.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'word is required' }));
      return;
    }

    const learnerId = learner_id || (user.role === 'learner' ? user.id : null);

    const meta = {
      user_answer: answer || '',
      translation_hint: translation_hint || '',
      card_type: type || 'word',
      source: 'interactive_card',
      learner_id: learnerId,
      correct: correct === true || correct === 'true',
      repetition_count: 1,
      last_seen: new Date().toISOString(),
    };

    const existing = await query(
      `SELECT id FROM brain_nodes WHERE label = $1 AND type = 'Skill' AND metadata->>'source' = 'interactive_card' LIMIT 1`,
      [word.trim()]
    );

    if (existing.rows && existing.rows.length > 0) {
      const row = existing.rows[0];
      const prevMeta = await query(
        `SELECT metadata FROM brain_nodes WHERE id = $1`,
        [row.id]
      );
      const prev = (prevMeta.rows[0] && prevMeta.rows[0].metadata) || {};
      const repCount = (prev.repetition_count || 0) + 1;
      meta.repetition_count = repCount;
      await query(
        `UPDATE brain_nodes SET metadata = metadata || $2::jsonb, updated_at = now() WHERE id = $1`,
        [row.id, JSON.stringify(meta)]
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, updated: true }));
      return;
    }

    const core = await query(`SELECT id FROM brain_nodes WHERE type = 'Core' LIMIT 1`);
    const newNode = await query(
      `INSERT INTO brain_nodes (label, type, metadata) VALUES ($1, 'Skill', $2::jsonb) RETURNING id`,
      [word.trim(), JSON.stringify(meta)]
    );

    if (core.rows && core.rows.length > 0 && newNode.rows && newNode.rows[0]) {
      await query(
        `INSERT INTO brain_edges (source_id, target_id) VALUES ($1, $2)`,
        [core.rows[0].id, newNode.rows[0].id]
      );
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('save-card error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
