// POST /api/learners/:id/reviewed — Mark AI suggestions as reviewed by teacher (human-in-the-loop)
import { query } from './db.js';

export default async function teacherOverrideHandler(req, res, pathname) {
  res.setHeader('Access-Control-Allow-Origin', '*');

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
