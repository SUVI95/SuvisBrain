// POST /api/auth/login — email + password (or email only for learners)
import { query } from './db.js';
import { signToken } from '../src/lib/auth.js';

export default async function authHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  const { email, password } = req.body || {};
  if (!email) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'email required' }));
    return;
  }

  try {
    const learner = await query(
      'SELECT id, name, email FROM learners WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (learner.rows.length > 0) {
      const l = learner.rows[0];
      const token = signToken({
        id: l.id,
        email: l.email,
        role: 'learner',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, role: 'learner', user: { id: l.id, name: l.name } }));
      return;
    }

    const teacher = await query(
      'SELECT id, name, email FROM teachers WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    if (teacher.rows.length > 0) {
      const t = teacher.rows[0];
      const token = signToken({
        id: t.id,
        email: t.email,
        role: 'teacher',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, role: 'teacher', user: { id: t.id, name: t.name } }));
      return;
    }

    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid email' }));
  } catch (err) {
    console.error('auth/login error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
