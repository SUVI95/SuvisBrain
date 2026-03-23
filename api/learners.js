// api/learners.js — GET /api/learners, GET /api/learners/:id/progress
import { query } from './db.js';

export default async function learnersHandler(req, res, pathname) {
  const match = pathname.match(/^\/api\/learners\/([a-f0-9-]+)\/progress$/);
  const learnerId = match ? match[1] : null;

  if (req.method === 'GET' && !learnerId) {
    if (!req.user || req.user.role !== 'teacher') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Teacher access required' }));
      return;
    }
    try {
      const result = await query(`
        SELECT l.*,
               COUNT(DISTINCT e.id)::int as session_count,
               MAX(e.created_at) as last_session
        FROM learners l
        LEFT JOIN episodes e ON e.learner_id = l.id
        GROUP BY l.id
        ORDER BY l.created_at ASC
      `);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const rows = result.rows.map((r) => {
        const sessionCount = parseInt(r.session_count) || 0;
        const lastSession = r.last_session ? new Date(r.last_session) : null;
        const daysSinceLast = lastSession ? (Date.now() - lastSession.getTime()) / (24 * 60 * 60 * 1000) : 999;
        const activeThisWeek = lastSession && lastSession >= weekAgo;
        let risk_level = 'LOW';
        if (sessionCount < 3 && (daysSinceLast > 7 || !lastSession)) risk_level = 'HIGH';
        else if (sessionCount < 5 || daysSinceLast > 7) risk_level = 'MEDIUM';
        return { ...r, risk_level };
      });
      const byRisk = (a, b) => {
        const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (order[a.risk_level] ?? 2) - (order[b.risk_level] ?? 2);
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rows.sort(byRisk)));
      return;
    } catch (err) {
      console.error('GET /api/learners error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  if (req.method === 'GET' && learnerId) {
    if (req.user && req.user.role === 'learner' && req.user.id !== learnerId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Can only view own progress' }));
      return;
    }
    try {
      const [learnerResult, nodesResult, episodesResult] = await Promise.all([
        query(`SELECT * FROM learners WHERE id = $1`, [learnerId]),
        query(
          `SELECT label, type, metadata,
                  (metadata->>'confidence_score')::float as confidence
           FROM brain_nodes
           WHERE type IN ('Skill','Memory')
             AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
           ORDER BY COALESCE((metadata->>'confidence_score')::float, 0.5) ASC NULLS FIRST`,
          [learnerId]
        ),
        query(
          `SELECT id, title, summary, duration_s, created_at, metadata
           FROM episodes
           WHERE learner_id = $1
           ORDER BY created_at DESC
           LIMIT 20`,
          [learnerId]
        ),
      ]);

      if (learnerResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Learner not found' }));
        return;
      }

      const nodes = (nodesResult.rows || []).map((r) => {
        const ch = r.confidence_history ?? (r.metadata && r.metadata.confidence_history);
        const hist = Array.isArray(ch) ? ch : (ch && typeof ch === 'object' ? Object.values(ch) : []);
        const history = hist.map((h) => ({
          score: typeof (h && h.score) === 'number' ? h.score : (h && h.c != null ? h.c : 0.5),
          date: (h && h.date) || (h && h.t && String(h.t).slice(0, 10)) || new Date().toISOString().slice(0, 10),
        }));
        return {
          label: r.label,
          type: r.type,
          confidence: r.confidence != null ? r.confidence : 0.5,
          history,
        };
      });

      const episodes = episodesResult.rows || [];
      const ykiEpisodes = episodes.filter(
        (e) => e.metadata && (e.metadata.is_yki_exam || e.metadata.yki_score)
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          learner: learnerResult.rows[0],
          nodes,
          episodes,
          yki_episodes: ykiEpisodes,
        })
      );
    } catch (err) {
      console.error('GET /api/learners/:id/progress error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(405).end();
}
