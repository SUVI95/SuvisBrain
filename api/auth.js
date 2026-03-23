// POST /api/auth — login
// Teachers: email + password (bcrypt). Learners: email only.
import bcrypt from 'bcrypt';
import { query } from './db.js';
import { signToken } from '../src/lib/auth.js';
import { parseOr400, authSchema } from '../src/lib/validation.js';
import { sendJson } from '../src/lib/middleware.js';

export default async function authHandler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'POST only' });
    return;
  }

  const parsed = parseOr400(authSchema, req.body || {}, res);
  if (parsed.error) {
    sendJson(res, parsed.error.status, { error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  try {
    const learner = await query(
      'SELECT id, name, email FROM learners WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (learner.rows.length > 0) {
      const l = learner.rows[0];
      const token = signToken({ id: l.id, email: l.email, role: 'learner' });
      sendJson(res, 200, { token, role: 'learner', user: { id: l.id, name: l.name } });
      return;
    }

    const teacher = await query(
      'SELECT id, name, email, password_hash FROM teachers WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (teacher.rows.length > 0) {
      const t = teacher.rows[0];
      if (!t.password_hash) {
        sendJson(res, 401, { error: 'Teacher account requires password setup. Contact admin.' });
        return;
      }
      const valid = await bcrypt.compare(password || '', t.password_hash);
      if (!valid) {
        sendJson(res, 401, { error: 'Invalid email or password' });
        return;
      }
      const token = signToken({ id: t.id, email: t.email, role: 'teacher' });
      sendJson(res, 200, { token, role: 'teacher', user: { id: t.id, name: t.name } });
      return;
    }

    sendJson(res, 401, { error: 'Invalid email' });
  } catch (err) {
    console.error('auth error:', err);
    sendJson(res, 500, { error: 'Something went wrong' });
  }
}
