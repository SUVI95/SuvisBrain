// Teacher decision + CEFR override endpoints
import { query } from './db.js';

const VALID_CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NOTE_CATEGORIES = ['general', 'motivation', 'risk', 'strength', 'goal'];
const ACTION_STATUS = ['suggested', 'approved', 'ignored', 'done'];

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function requireTeacher(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    send(res, 403, { error: 'Teacher access required' });
    return false;
  }
  return true;
}

export default async function teacherOverrideHandler(req, res, pathname) {
  if (!requireTeacher(req, res)) return;

  const reviewedMatch = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/reviewed$/);
  const notesMatch = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/teacher-notes$/);
  const actionsMatch = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/teacher-actions$/);

  if (reviewedMatch) {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    const learnerId = reviewedMatch[1];
    try {
      await query(`UPDATE learners SET teacher_reviewed_at = now(), updated_at = now() WHERE id = $1`, [learnerId]);
      return send(res, 200, { ok: true, message: 'Marked as reviewed by teacher' });
    } catch (err) {
      console.error('teacher reviewed error:', err);
      return send(res, 500, { error: err.message });
    }
  }

  if (notesMatch) {
    const learnerId = notesMatch[1];
    if (req.method === 'GET') {
      try {
        const rows = await query(`SELECT id, note, category, created_at, updated_at FROM teacher_notes WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 20`, [learnerId]);
        return send(res, 200, { notes: rows.rows || [] });
      } catch (err) {
        console.error('teacher notes get error:', err);
        return send(res, 500, { error: err.message });
      }
    }
    if (req.method === 'POST') {
      const note = String(req.body?.note || '').trim();
      const category = NOTE_CATEGORIES.includes(String(req.body?.category || '').trim()) ? String(req.body.category).trim() : 'general';
      if (!note) return send(res, 400, { error: 'note required' });
      try {
        const rows = await query(
          `INSERT INTO teacher_notes (learner_id, teacher_id, note, category) VALUES ($1, $2, $3, $4) RETURNING id, note, category, created_at`,
          [learnerId, req.user.id, note.slice(0, 2000), category]
        );
        return send(res, 200, { ok: true, note: rows.rows?.[0] || null });
      } catch (err) {
        console.error('teacher notes post error:', err);
        return send(res, 500, { error: err.message });
      }
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  if (actionsMatch) {
    const learnerId = actionsMatch[1];
    if (req.method === 'GET') {
      try {
        const rows = await query(`SELECT id, action_type, status, ai_title, ai_reason, ai_draft, teacher_decision, created_at, updated_at FROM teacher_actions WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 20`, [learnerId]);
        return send(res, 200, { actions: rows.rows || [] });
      } catch (err) {
        console.error('teacher actions get error:', err);
        return send(res, 500, { error: err.message });
      }
    }
    if (req.method === 'POST') {
      const actionType = String(req.body?.action_type || '').trim() || 'teacher_follow_up';
      const status = ACTION_STATUS.includes(String(req.body?.status || '').trim()) ? String(req.body.status).trim() : 'suggested';
      try {
        const rows = await query(
          `INSERT INTO teacher_actions (learner_id, teacher_id, action_type, status, ai_title, ai_reason, ai_draft, teacher_decision)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, action_type, status, ai_title, ai_reason, ai_draft, teacher_decision, created_at`,
          [
            learnerId,
            req.user.id,
            actionType,
            status,
            req.body?.ai_title || null,
            req.body?.ai_reason || null,
            req.body?.ai_draft || null,
            req.body?.teacher_decision || null,
          ]
        );
        return send(res, 200, { ok: true, action: rows.rows?.[0] || null });
      } catch (err) {
        console.error('teacher actions post error:', err);
        return send(res, 500, { error: err.message });
      }
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  return send(res, 404, { error: 'Not found' });
}

export async function teacherCefrOverrideHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  const { learnerId, newLevel } = req.body || {};
  if (!learnerId) return send(res, 400, { error: 'learnerId required' });
  const level = String(newLevel || '').trim().toUpperCase();
  if (!VALID_CEFR.includes(level)) return send(res, 400, { error: 'newLevel must be one of: A1, A2, B1, B2, C1, C2' });
  try {
    const learnerRow = await query('SELECT cefr_level FROM learners WHERE id = $1', [learnerId]);
    const fromLevel = learnerRow.rows[0]?.cefr_level || 'A1';
    await query('UPDATE learners SET cefr_level = $2, updated_at = now() WHERE id = $1', [learnerId, level]);
    try {
      await query(`INSERT INTO cefr_history (learner_id, from_level, to_level, reason) VALUES ($1, $2, $3, 'teacher_override')`, [learnerId, fromLevel, level]);
    } catch (_) {}
    return send(res, 200, { ok: true, message: 'CEFR level updated' });
  } catch (err) {
    console.error('teacher-cefr-override error:', err);
    return send(res, 500, { error: err.message });
  }
}
