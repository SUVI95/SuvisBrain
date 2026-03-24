// POST /api/admin/organisations — create organisation (admin only)
import { query } from './db.js';

const VALID_TYPE = ['school', 'municipality', 'company'];
const VALID_PLAN = ['trial', 'basic', 'pro'];

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function adminOrganisationsHandler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST only' });
  }
  if (!req.user || req.user.role !== 'admin') {
    return sendJson(res, 403, { error: 'Admin access required' });
  }

  const { name, type, plan } = req.body || {};
  const trimmedName = (name && String(name).trim()) || '';
  if (!trimmedName) {
    return sendJson(res, 400, { error: 'name is required' });
  }
  const t = (type && String(type).trim().toLowerCase()) || 'school';
  const p = (plan && String(plan).trim().toLowerCase()) || 'trial';
  if (!VALID_TYPE.includes(t)) {
    return sendJson(res, 400, { error: `type must be one of: ${VALID_TYPE.join(', ')}` });
  }
  if (!VALID_PLAN.includes(p)) {
    return sendJson(res, 400, { error: `plan must be one of: ${VALID_PLAN.join(', ')}` });
  }

  try {
    const result = await query(
      `INSERT INTO organisations (name, type, plan)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, plan`,
      [trimmedName, t, p]
    );
    const org = result.rows[0];
    sendJson(res, 200, { id: org.id, name: org.name, type: org.type, plan: org.plan });
  } catch (err) {
    if (err.code === '23505') {
      return sendJson(res, 409, { error: 'Organisation name already exists' });
    }
    console.error('admin/organisations:', err);
    sendJson(res, 500, { error: err.message });
  }
}
