// api/teacher-dashboard.js — GET /api/teacher/learners, POST /api/teacher/nudge/:learnerId
import { query } from './db.js';

const RESEND_URL = 'https://api.resend.com/emails';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function requireTeacher(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    sendJson(res, 403, { error: 'Teacher access required' });
    return false;
  }
  return true;
}

function streakFromDates(sessionDates, todayStr) {
  const set = new Set(sessionDates || []);
  let streak = 0;
  const base = new Date(todayStr + 'T12:00:00Z');
  for (let i = 0; i < 400; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (set.has(key)) streak += 1;
    else break;
  }
  return streak;
}

// GET /api/teacher/learners — { summary, learners: [...] }
export async function getLearnersHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'GET only' });
  }
  try {
    const orgId = req.user.org_id || null;
    const whereClause = orgId ? 'WHERE l.org_id = $1' : '';
    const params = orgId ? [orgId] : [];

    const result = await query(
      `WITH ep AS (
        SELECT
          learner_id,
          COUNT(*)::int AS sessions_total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS sessions_this_week,
          MAX(created_at) AS last_session_at
        FROM episodes
        WHERE learner_id IS NOT NULL
        GROUP BY learner_id
      ),
      last_ep AS (
        SELECT DISTINCT ON (e.learner_id)
          e.learner_id,
          e.title AS last_session_title,
          e.created_at AS last_ep_at
        FROM episodes e
        WHERE e.learner_id IS NOT NULL
        ORDER BY e.learner_id, e.created_at DESC
      )
      SELECT
        l.id,
        l.name,
        l.email,
        l.cefr_level,
        l.mother_tongue,
        l.teacher_reviewed_at,
        COALESCE(ep.sessions_this_week, 0)::int AS sessions_this_week,
        COALESCE(ep.sessions_total, 0)::int AS sessions_total,
        ep.last_session_at,
        le.last_session_title,
        COALESCE(ep.sessions_total, 0)::int AS total_sessions,
        ep.last_session_at AS last_session
      FROM learners l
      LEFT JOIN ep ON ep.learner_id = l.id
      LEFT JOIN last_ep le ON le.learner_id = l.id
      ${whereClause}
      ORDER BY ep.last_session_at DESC NULLS LAST`,
      params
    );

    const learnerIds = (result.rows || []).map((r) => r.id);
    let dateRows = [];
    if (learnerIds.length) {
      // Use IN ($1,$2,…) instead of ANY($1::uuid[]) — some Neon/serverless paths
      // mishandle uuid[] binding; expanded placeholders are equivalent and reliable.
      const placeholders = learnerIds.map((_, i) => `$${i + 1}`).join(', ');
      const dr = await query(
        `SELECT learner_id, (created_at AT TIME ZONE 'UTC')::date::text AS d
         FROM episodes
         WHERE learner_id IN (${placeholders})
         GROUP BY learner_id, (created_at AT TIME ZONE 'UTC')::date`,
        learnerIds
      );
      dateRows = dr.rows || [];
    }
    const datesByLearner = new Map();
    for (const row of dateRows) {
      if (!datesByLearner.has(row.learner_id)) datesByLearner.set(row.learner_id, []);
      datesByLearner.get(row.learner_id).push(row.d);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const learners = (result.rows || []).map((r) => {
      const sessionsTotal = r.sessions_total ?? 0;
      const sessionsWeek = r.sessions_this_week ?? 0;
      const lastAt = r.last_session_at;
      const atRisk =
        !lastAt || new Date(lastAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const streak = streakFromDates(datesByLearner.get(r.id) || [], todayStr);
      return {
        ...r,
        last_session_at: lastAt,
        streak,
        xp: sessionsTotal * 50,
        at_risk: atRisk,
      };
    });

    const totalLearners = learners.length;
    const activeThisWeek = learners.filter((l) => (l.sessions_this_week || 0) > 0).length;
    const atRiskCount = learners.filter((l) => l.at_risk).length;
    const totalSessionsThisWeek = learners.reduce((s, l) => s + (l.sessions_this_week || 0), 0);
    const avgSessionsPerActiveLearner =
      activeThisWeek > 0 ? Math.round((totalSessionsThisWeek / activeThisWeek) * 10) / 10 : 0;

    sendJson(res, 200, {
      summary: {
        total_learners: totalLearners,
        active_this_week: activeThisWeek,
        at_risk_count: atRiskCount,
        total_sessions_this_week: totalSessionsThisWeek,
        avg_sessions_per_active_learner: avgSessionsPerActiveLearner,
      },
      learners,
    });
  } catch (err) {
    console.error('GET /api/teacher/learners:', err);
    const msg = err.message || 'Query failed';
    const hint =
      /org_id|teacher_reviewed|column .* does not exist/i.test(msg)
        ? ' Hint: apply src/data/ensure-all.sql (or node scripts/migrate-organisations.js) on Neon.'
        : '';
    sendJson(res, 500, { error: msg + hint });
  }
}

// POST /api/teacher/nudge/:learnerId
export async function nudgeHandler(req, res, learnerId) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST only' });
  }
  if (!learnerId) {
    return sendJson(res, 400, { error: 'Learner ID required' });
  }
  try {
    const orgId = req.user.org_id || null;
    const learnerWhere = orgId
      ? 'id = $1 AND (org_id = $2 OR org_id IS NULL)'
      : 'id = $1';
    const learnerParams = orgId ? [learnerId, orgId] : [learnerId];
    const learnerResult = await query(
      `SELECT id, name, email FROM learners WHERE ${learnerWhere}`,
      learnerParams
    );
    if (learnerResult.rows.length === 0) {
      return sendJson(res, 404, { error: 'Learner not found' });
    }
    const learner = learnerResult.rows[0];
    if (!learner.email) {
      return sendJson(res, 400, { error: 'Learner has no email' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || 'Knuut <onboarding@resend.dev>';
    if (!apiKey) {
      return sendJson(res, 500, { error: 'RESEND_API_KEY not set' });
    }

    const name = (learner.name || 'learner').trim();
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <h1 style="margin:0 0 24px;color:#1d9e75;font-size:24px">Knuut AI</h1>
    <p style="margin:0 0 24px;font-size:16px">Hi ${name.replace(/</g, '&lt;')}, you haven't practiced Finnish in a few days. Come back and keep your streak going!</p>
    <a href="https://suvisbrain.vercel.app/knuut.html" style="display:inline-block;padding:14px 28px;background:#1d9e75;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Practice now →</a>
    <p style="margin:24px 0 0;font-size:12px;color:#999">Knuut AI by HSBRIDGE AI · Kajaani, Finland</p>
  </div>
</body>
</html>`;

    const resendRes = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: learner.email,
        subject: 'Knuut misses you! 🇫🇮',
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}));
      throw new Error(err.message || resendRes.statusText || 'Resend API error');
    }

    sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('POST /api/teacher/nudge:', err);
    sendJson(res, 500, { error: err.message });
  }
}

// POST /api/teacher/nudge/bulk — nudge multiple learners at once
export async function nudgeBulkHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'POST only' });
  }
  const { learner_ids: learnerIds } = req.body || {};
  if (!Array.isArray(learnerIds) || learnerIds.length === 0) {
    return sendJson(res, 400, { error: 'learner_ids array required' });
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, { error: 'RESEND_API_KEY not set' });
  }
  const orgId = req.user.org_id || null;
  const learnerWhere = orgId
    ? 'id = ANY($1::uuid[]) AND (org_id = $2 OR org_id IS NULL)'
    : 'id = ANY($1::uuid[])';
  const learnerParams = orgId ? [learnerIds, orgId] : [learnerIds];
  try {
    const learnerResult = await query(
      `SELECT id, name, email FROM learners WHERE ${learnerWhere}`,
      learnerParams
    );
    const withEmail = learnerResult.rows.filter((l) => l.email);
    const sent = [];
    const failed = [];
    const from = process.env.RESEND_FROM || 'Knuut <onboarding@resend.dev>';
    for (const learner of withEmail) {
      try {
        const name = (learner.name || 'learner').trim();
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <h1 style="margin:0 0 24px;color:#1d9e75;font-size:24px">Knuut AI</h1>
    <p style="margin:0 0 24px;font-size:16px">Hi ${name.replace(/</g, '&lt;')}, you haven't practiced Finnish in a few days. Come back and keep your streak going!</p>
    <a href="https://suvisbrain.vercel.app/knuut.html" style="display:inline-block;padding:14px 28px;background:#1d9e75;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Practice now →</a>
    <p style="margin:24px 0 0;font-size:12px;color:#999">Knuut AI by HSBRIDGE AI · Kajaani, Finland</p>
  </div>
</body>
</html>`;
        const resendRes = await fetch(RESEND_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: learner.email,
            subject: 'Knuut misses you! 🇫🇮',
            html,
          }),
        });
        if (resendRes.ok) sent.push(learner.id); else failed.push({ id: learner.id, reason: resendRes.statusText });
      } catch (e) {
        failed.push({ id: learner.id, reason: e.message });
      }
    }
    return sendJson(res, 200, { sent: sent.length, failed: failed.length, no_email: learnerIds.length - withEmail.length, details: failed });
  } catch (err) {
    console.error('POST /api/teacher/nudge/bulk:', err);
    return sendJson(res, 500, { error: err.message });
  }
}
