// POST /api/brain/use-freeze — learner uses a streak freeze for yesterday
import { query } from './db.js';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function brainUseFreezeHandler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const user = req.user;
  if (!user || user.role !== 'learner') return sendJson(res, 401, { error: 'Unauthorized' });

  const learnerId = user.id;

  try {
    const learner = await query(
      `SELECT streak_freezes_remaining, streak_freezes_used FROM learners WHERE id = $1`,
      [learnerId]
    );
    if (!learner.rows[0]) return sendJson(res, 404, { error: 'Learner not found' });

    const remaining = Math.max(0, parseInt(learner.rows[0].streak_freezes_remaining) || 2);
    if (remaining < 1) return sendJson(res, 400, { error: 'No freezes remaining' });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    const used = learner.rows[0].streak_freezes_used;
    const arr = Array.isArray(used) ? [...used] : [];
    if (arr.includes(dateStr)) return sendJson(res, 400, { error: 'Freeze already used for this day' });

    arr.push(dateStr);
    await query(
      `UPDATE learners SET streak_freezes_remaining = COALESCE(streak_freezes_remaining, 2) - 1,
       streak_freezes_used = $2::jsonb, updated_at = now() WHERE id = $1`,
      [learnerId, JSON.stringify(arr)]
    );

    sendJson(res, 200, { success: true, streak_freezes_remaining: remaining - 1 });
  } catch (err) {
    console.error('brain/use-freeze:', err);
    sendJson(res, 500, { error: err.message });
  }
}
