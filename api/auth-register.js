// POST /api/auth/register — create learner from onboarding, return token
import { query } from './db.js';
import { signToken } from '../src/lib/auth.js';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function registerHandler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST only' });
  }

  const { name, mother_tongue, learning_goal, cefr_level } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return sendJson(res, 400, { error: 'Name is required' });
  }

  const trimmedName = name.trim().slice(0, 200);
  const trimmedMotherTongue = (mother_tongue && String(mother_tongue).trim()) || null;
  const trimmedGoal = (learning_goal && String(learning_goal).trim()) || null;
  const level = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(String(cefr_level || '').trim()) 
    ? String(cefr_level).trim() 
    : 'A1';

  try {
    const defaultOrg = await query(
      `SELECT id FROM organisations ORDER BY created_at ASC LIMIT 1`
    );
    const orgId = defaultOrg.rows[0]?.id || null;

    const email = `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@knuut.fi`;
    const result = await query(
      `INSERT INTO learners (name, email, mother_tongue, learning_goal, cefr_level, org_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email`,
      [trimmedName, email, trimmedMotherTongue, trimmedGoal, level, orgId]
    );
    const learner = result.rows[0];
    const token = signToken({
      id: learner.id,
      email: learner.email,
      role: 'learner',
      org_id: orgId,
    });
    sendJson(res, 200, { 
      token, 
      role: 'learner', 
      user: { id: learner.id, name: learner.name } 
    });
  } catch (err) {
    console.error('auth-register error:', err);
    sendJson(res, 500, { error: 'Registration failed' });
  }
}
