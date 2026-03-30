// api/learners.js — GET /api/learners, GET /api/learners/:id/progress
import { query } from './db.js';

function buildSessionAlerts(episodes) {
  const alerts = [];
  const scored = (episodes || [])
    .map((e) => {
      const sc = e.metadata && typeof e.metadata.session_score === 'number' ? e.metadata.session_score : null;
      return sc == null ? null : { at: e.created_at, score: sc };
    })
    .filter(Boolean)
    .slice(0, 12);
  if (scored.length >= 3) {
    const a = scored[0].score;
    const b = scored[1].score;
    const c = scored[2].score;
    if (a < b && b < c && c < 58 && a < 50) {
      alerts.push({
        type: 'session_score_trend_down',
        severity: 'info',
        message_fi: 'Viimeisten sessioiden pisteet ovat tulleet alas. Käytä Knuutissa Hätäapu-painiketta omalla kielelläsi.',
        message_en: 'Your last few session scores have dropped. Use the Help button in Knuut in your language.',
      });
    }
    if (a < 40 && b < 45 && c < 48) {
      alerts.push({
        type: 'session_scores_low_run',
        severity: 'warning',
        message_fi: 'Harjoitukset ovat tuntuneet raskailta. Lyhyet sessiot ja lepo auttavat.',
        message_en: 'Recent sessions have been difficult. Short practices and rest help.',
      });
    }
  }
  if (scored.length >= 1 && scored[0].score < 35) {
    alerts.push({
      type: 'low_last_session',
      severity: 'warning',
      message_fi: 'Viime harjoitus oli erityisen haastava. Riittää yksi lyhyt kerta tänään.',
      message_en: 'Last practice was especially hard. One short session is enough today.',
    });
  }
  return alerts;
}

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
      const orgId = req.user.org_id || null;
      const result = await query(
        `SELECT l.*,
               COUNT(DISTINCT e.id)::int as session_count,
               MAX(e.created_at) as last_session
        FROM learners l
        LEFT JOIN episodes e ON e.learner_id = l.id
        ${orgId ? 'WHERE l.org_id = $1' : ''}
        GROUP BY l.id
        ORDER BY l.created_at ASC`,
        orgId ? [orgId] : []
      );
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
      const orgId = req.user?.org_id || null;
      const learnerWhere = orgId
        ? `id = $1 AND (org_id = $2 OR org_id IS NULL)`
        : `id = $1`;
      const learnerParams = orgId ? [learnerId, orgId] : [learnerId];

      const [learnerResult, nodesResult, episodesResult] = await Promise.all([
        query(`SELECT * FROM learners WHERE ${learnerWhere}`, learnerParams),
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
           ${orgId ? 'AND (org_id = $2 OR org_id IS NULL)' : ''}
           ORDER BY created_at DESC
           LIMIT 20`,
          orgId ? [learnerId, orgId] : [learnerId]
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
          session_alerts: buildSessionAlerts(episodes),
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
