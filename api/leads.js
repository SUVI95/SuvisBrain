// api/leads.js — GET /api/leads, PATCH /api/leads/:id
import { query } from './db.js';

const VALID_STATUS = ['open', 'won', 'lost', 'follow_up'];

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export async function getLeadsHandler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'GET only' });
  }
  try {
    const result = await query(`
      SELECT
        e.id, e.title, e.summary, e.created_at, e.metadata, e.agent_id,
        a.name as agent_name
      FROM episodes e
      JOIN agents a ON a.id = e.agent_id
      WHERE e.lead_qualified = true
      ORDER BY e.created_at DESC
    `);
    sendJson(res, 200, result.rows || []);
  } catch (err) {
    console.error('GET /api/leads:', err);
    sendJson(res, 500, { error: err.message });
  }
}

export async function patchLeadHandler(req, res, leadId) {
  if (req.method !== 'PATCH') {
    return sendJson(res, 405, { error: 'PATCH only' });
  }
  if (!leadId) {
    return sendJson(res, 400, { error: 'Lead ID required' });
  }
  const { status, notes } = req.body || {};
  const params = [];
  let idx = 1;
  const metaUpdates = [];
  if (status !== undefined) {
    const s = String(status || '').toLowerCase().trim();
    if (!VALID_STATUS.includes(s)) {
      return sendJson(res, 400, { error: 'status must be one of: open, won, lost, follow_up' });
    }
    metaUpdates.push(['lead_status', JSON.stringify(s)]);
  }
  if (notes !== undefined) {
    metaUpdates.push(['lead_notes', JSON.stringify(String(notes || '').slice(0, 5000))]);
  }
  if (metaUpdates.length === 0) {
    return sendJson(res, 400, { error: 'Provide status and/or notes' });
  }
  let inner = "COALESCE(metadata, '{}')";
  for (const [key, val] of metaUpdates) {
    params.push(val);
    inner = `jsonb_set(${inner}, '{${key}}', $${idx}::jsonb)`;
    idx++;
  }
  params.push(leadId);
  try {
    await query(
      `UPDATE episodes SET metadata = ${inner} WHERE id = $${idx} AND lead_qualified = true`,
      params
    );
    sendJson(res, 200, { success: true, status: status !== undefined ? String(status).toLowerCase().trim() : undefined, notes: notes !== undefined ? String(notes).slice(0, 5000) : undefined });
  } catch (err) {
    console.error('PATCH /api/leads:', err);
    sendJson(res, 500, { error: err.message });
  }
}
