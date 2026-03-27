// POST /api/learners/:id/reviewed — Mark AI suggestions as reviewed by teacher (human-in-the-loop)
// POST /api/teacher-override — CEFR level override (body: { learnerId, newLevel })
import { query } from './db.js';

const VALID_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default async function teacherOverrideHandler(req, res, pathname) {
  if (!req.user || req.user.role !== 'teacher') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Teacher access required' }));
    return;
  }

  const match = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/reviewed$/);
  const learnerId = match ? match[1] : null;

  if (req.method !== 'POST' || !learnerId) {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST with learner id required' }));
    return;
  }

  try {
    await query(
      `UPDATE learners SET teacher_reviewed_at = now(), updated_at = now() WHERE id = $1`,
      [learnerId]
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Marked as reviewed by teacher' }));
  } catch (err) {
    console.error('teacher-override error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

export async function teacherCefrOverrideHandler(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Teacher access required' }));
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }
  const { learnerId, newLevel } = req.body || {};
  if (!learnerId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'learnerId required' }));
    return;
  }
  const level = String(newLevel || '').trim().toUpperCase();
  if (!VALID_CEFR.includes(level)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'newLevel must be one of: A1, A2, B1, B2, C1, C2' }));
    return;
  }
  try {
    const learnerRow = await query('SELECT cefr_level FROM learners WHERE id = $1', [learnerId]);
    const fromLevel = learnerRow.rows[0]?.cefr_level || 'A1';
    await query(
      'UPDATE learners SET cefr_level = $2, updated_at = now() WHERE id = $1',
      [learnerId, level]
    );
    try {
      await query(
        `INSERT INTO cefr_history (learner_id, from_level, to_level, reason) VALUES ($1, $2, $3, 'teacher_override')`,
        [learnerId, fromLevel, level]
      );
    } catch (_) { /* cefr_history may not exist yet */ }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'CEFR level updated' }));
  } catch (err) {
    console.error('teacher-cefr-override error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
