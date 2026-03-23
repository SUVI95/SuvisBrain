// GET /api/user-data/export, DELETE /api/user-data — GDPR data export & deletion
import { query } from './db.js';

export default async function userDataHandler(req, res, pathname) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const match = pathname.match(/^\/api\/user-data\/(export|delete)$/);
  const action = match ? match[1] : null;

  if (!req.user || !req.user.id) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (req.user.role !== 'learner') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Only learners can export or delete their data' }));
    return;
  }

  const userId = req.user.id;

  if (action === 'export') {
    try {
      const [learnerRow, nodesRow, episodesRow] = await Promise.all([
        query('SELECT id, name, email, mother_tongue, cefr_level, created_at FROM learners WHERE id = $1', [userId]),
        query(
          `SELECT label, type, metadata->>'confidence_score' as confidence_score, metadata->>'source' as source, created_at
           FROM brain_nodes
           WHERE metadata->>'learner_id' = $1
           ORDER BY label`,
          [userId]
        ),
        query(
          `SELECT id, title, summary, duration_s, created_at, metadata
           FROM episodes WHERE learner_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
      ]);

      const learner = learnerRow.rows[0] || {};
      const nodes = (nodesRow.rows || []).map((r) => ({
        skill: r.label,
        type: r.type,
        confidence: r.confidence_score,
        source: r.source,
        created_at: r.created_at,
      }));
      const episodes = (episodesRow.rows || []).map((e) => ({
        id: e.id,
        title: e.title,
        summary: e.summary,
        duration_min: e.duration_s ? Math.round(e.duration_s / 60) : null,
        created_at: e.created_at,
        is_yki: !!(e.metadata && (e.metadata.is_yki_exam || e.metadata.yki_score)),
      }));

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        learner: { id: learner.id, name: learner.name, email: learner.email, cefr_level: learner.cefr_level },
        progress: nodes,
        sessions: episodes,
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="knuut-my-data.json"',
      });
      res.end(JSON.stringify(exportData, null, 2));
    } catch (err) {
      console.error('user-data export error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (action === 'delete') {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    try {
      await query('UPDATE episodes SET learner_id = NULL, metadata = metadata - \'yki_score\' - \'is_yki_exam\' WHERE learner_id = $1', [userId]);
      await query('DELETE FROM brain_nodes WHERE metadata->>\'learner_id\' = $1', [userId]);
      await query('DELETE FROM learners WHERE id = $1', [userId]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Your data has been deleted.' }));
    } catch (err) {
      console.error('user-data delete error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404).end();
}
