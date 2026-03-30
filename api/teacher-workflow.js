/**
 * ALKUPOLKU teacher workflow — daily overview, alerts, HOPS draft, placements, cohort, reports preview
 * GET/POST /api/teacher/workflow/...
 */
import { query } from './db.js';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function requireTeacher(req, res) {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
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

function normCefr(s) {
  if (!s) return 'unknown';
  const x = String(s).trim().toLowerCase();
  if (x.includes('pre') || x === 'a0') return 'pre-A1';
  if (x.startsWith('a1')) return 'A1';
  if (x.startsWith('a2')) return 'A2';
  if (x.startsWith('b1')) return 'B1';
  if (x.startsWith('b2')) return 'B2';
  if (x.startsWith('c')) return 'C1+';
  return x.slice(0, 4).toUpperCase();
}

/** Next Monday (strictly after today) in Europe/Helsinki as YYYY-MM-DD */
function nextMondayStrHelsinki() {
  const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Helsinki' }));
  const day = t.getDay();
  let add = (8 - day) % 7;
  if (add === 0) add = 7;
  t.setDate(t.getDate() + add);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Build daily overview + alerts + cohort + placements from DB */
export async function getWorkflowHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'GET only' });
  }

  const orgId = req.user.org_id || null;
  const whereOrg = orgId ? 'AND l.org_id = $1' : '';
  const params = orgId ? [orgId] : [];

  try {
    const learnersRes = await query(
      `SELECT l.id, l.name, l.email, l.cefr_level, l.mother_tongue, l.teacher_reviewed_at,
              (SELECT COUNT(*)::int FROM episodes e WHERE e.learner_id = l.id) AS sessions_total,
              (SELECT MAX(e.created_at) FROM episodes e WHERE e.learner_id = l.id) AS last_session_at,
              (SELECT COUNT(*)::int FROM episodes e WHERE e.learner_id = l.id
                 AND (e.created_at AT TIME ZONE 'Europe/Helsinki')::date =
                     (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Helsinki')::date) AS sessions_today
       FROM learners l
       WHERE 1=1 ${whereOrg}
       ORDER BY l.name ASC`,
      params
    );

    const learnerIds = (learnersRes.rows || []).map((r) => r.id);
    let dateRows = [];
    if (learnerIds.length) {
      const ph = learnerIds.map((_, i) => `$${i + 1}`).join(', ');
      const dr = await query(
        `SELECT learner_id, (created_at AT TIME ZONE 'UTC')::date::text AS d
         FROM episodes WHERE learner_id IN (${ph})
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

    const todayFi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' });
    const todayStr = todayFi;

    const rows = learnersRes.rows || [];
    const enriched = rows.map((r) => {
      const streak = streakFromDates(datesByLearner.get(r.id) || [], todayStr);
      const lastAt = r.last_session_at ? new Date(r.last_session_at) : null;
      const daysSince = lastAt ? (Date.now() - lastAt.getTime()) / (864e5) : 999;
      return {
        id: r.id,
        name: r.name,
        email: r.email,
        cefr_level: r.cefr_level,
        mother_tongue: r.mother_tongue,
        teacher_reviewed_at: r.teacher_reviewed_at,
        sessions_total: r.sessions_total || 0,
        sessions_today: r.sessions_today || 0,
        last_session_at: r.last_session_at,
        streak,
        days_since_session: Math.round(daysSince * 10) / 10,
      };
    });

    const active_today = enriched.filter((l) => l.sessions_today > 0);
    const not_active_today = enriched.filter((l) => l.sessions_today === 0 && l.sessions_total > 0);
    const no_login_24h = enriched.filter((l) => {
      if (!l.last_session_at) return true;
      return Date.now() - new Date(l.last_session_at).getTime() > 24 * 3600 * 1000;
    });
    const inactive_3d = enriched.filter((l) => l.days_since_session >= 3);
    const streak_broken = enriched.filter(
      (l) => l.streak === 0 && l.sessions_total >= 3 && l.last_session_at && l.days_since_session <= 14
    );
    const yki_ready = enriched.filter((l) => {
      const c = normCefr(l.cefr_level);
      return (c === 'A2' || c === 'B1' || c === 'B2' || c === 'C1+') && (l.sessions_total || 0) >= 8;
    });
    const hops_overdue = enriched.filter(
      (l) => !l.teacher_reviewed_at && l.last_session_at && l.days_since_session >= 14
    );

    let placement_monday = [];
    let placements = [];
    try {
      const pl = await query(
        `SELECT lp.*, l.name AS learner_name, l.email AS learner_email
         FROM learner_placements lp
         JOIN learners l ON l.id = lp.learner_id
         ${orgId ? 'WHERE l.org_id = $1' : ''}
         ORDER BY lp.start_date NULLS LAST`,
        orgId ? [orgId] : []
      );
      placements = pl.rows || [];
      const nmStr = nextMondayStrHelsinki();
      placement_monday = placements.filter((p) => p.start_date && String(p.start_date).slice(0, 10) === nmStr);
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }

    const alerts = [];
    const alertKeys = new Set();
    const pushAlert = (a) => {
      const k = `${a.type}:${a.learner_id}`;
      if (alertKeys.has(k)) return;
      alertKeys.add(k);
      alerts.push(a);
    };
    for (const l of inactive_3d) {
      pushAlert({
        type: 'inactive_3d',
        severity: 'warning',
        learner_id: l.id,
        learner_name: l.name,
        message: `Ei harjoitusta ${Math.floor(l.days_since_session)} päivään`,
      });
    }
    for (const l of streak_broken) {
      pushAlert({
        type: 'streak_broken',
        severity: 'info',
        learner_id: l.id,
        learner_name: l.name,
        message: 'Putki katkennut — viimeksi aktiivinen äskettäin',
      });
    }
    for (const l of yki_ready) {
      pushAlert({
        type: 'yki_suggest',
        severity: 'success',
        learner_id: l.id,
        learner_name: l.name,
        message: `Taso ${l.cefr_level || '?'} — harkitse YKI-keskustelua`,
      });
    }
    for (const l of hops_overdue) {
      pushAlert({
        type: 'hops_review',
        severity: 'warning',
        learner_id: l.id,
        learner_name: l.name,
        message: 'HOPS / väliarviointi kaipaa katselmointia (14+ pv aktiivisuudesta)',
      });
    }

    const cefr_distribution = {};
    for (const l of enriched) {
      const k = normCefr(l.cefr_level);
      cefr_distribution[k] = (cefr_distribution[k] || 0) + 1;
    }

    const report_month = new Date().toISOString().slice(0, 7);
    const total_otp_days = enriched.reduce((s, l) => s + Math.min(22, Math.floor((l.sessions_total || 0) / 4)), 0);

    sendJson(res, 200, {
      generated_at: new Date().toISOString(),
      timezone: 'Europe/Helsinki',
      daily: {
        active_today,
        not_practiced_today: not_active_today,
        no_recent_login_24h: no_login_24h,
        inactive_3_days: inactive_3d,
        streak_broken,
        yki_ready_candidates: yki_ready,
        placement_starts_next_monday: placement_monday,
        hops_review_suggested: hops_overdue,
      },
      alerts: alerts.slice(0, 40),
      cohort: {
        total: enriched.length,
        cefr_distribution,
      },
      placements,
      reports_preview: {
        month: report_month,
        learner_count: enriched.length,
        total_sessions_month_estimate: enriched.reduce((s, l) => s + (l.sessions_total || 0), 0),
        otp_days_mock: total_otp_days,
        toteumaraportti_lines: [
          `Kuukausi: ${report_month}`,
          `Opiskelijoita: ${enriched.length}`,
          `Harjoituskertoja (yhteensä, arvio): ${enriched.reduce((s, l) => s + (l.sessions_total || 0), 0)}`,
          `OTP-päivät (demo-laskenta): ${total_otp_days}`,
        ],
        loppuraportti_lines: [
          'Loppuraportti — luonnos (täytä Kuopio 5182/5183)',
          `Ryhmäkoko: ${enriched.length} opiskelijaa`,
          'Kielitasojakauma: katso cohort.cefr_distribution',
        ],
      },
      learners: enriched,
    });
  } catch (err) {
    console.error('teacher-workflow GET:', err);
    sendJson(res, 500, { error: err.message || 'Workflow error' });
  }
}

async function fetchLearnerContext(learnerId, orgId) {
  const lw = orgId
    ? 'id = $1 AND (org_id = $2 OR org_id IS NULL)'
    : 'id = $1';
  const lp = orgId ? [learnerId, orgId] : [learnerId];
  const [lr, ep, nodes, cnt] = await Promise.all([
    query(`SELECT * FROM learners WHERE ${lw}`, lp),
    query(
      `SELECT title, summary, created_at, metadata FROM episodes WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 12`,
      [learnerId]
    ),
    query(`SELECT label, metadata FROM brain_nodes WHERE metadata->>'learner_id' = $1 LIMIT 40`, [learnerId]),
    query(`SELECT COUNT(*)::int AS c FROM episodes WHERE learner_id = $1`, [learnerId]),
  ]);
  if (!lr.rows.length) return null;
  return {
    learner: lr.rows[0],
    episodes: ep.rows || [],
    nodes: nodes.rows || [],
    session_count: cnt.rows[0]?.c ?? 0,
  };
}

export async function postHopsDraftHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
  const learnerId = req.body?.learner_id;
  if (!learnerId) return sendJson(res, 400, { error: 'learner_id required' });

  const orgId = req.user.org_id || null;
  try {
    const ctx = await fetchLearnerContext(learnerId, orgId);
    if (!ctx) return sendJson(res, 404, { error: 'Learner not found' });

    const { learner, episodes, nodes, session_count: sessionCount } = ctx;
    const titles = episodes.map((e) => e.title).filter(Boolean).slice(0, 6);
    const avgConf =
      nodes.length > 0
        ? nodes.reduce((s, n) => {
            const c = n.metadata && (n.metadata.confidence_score ?? n.metadata.confidence);
            return s + (typeof c === 'number' ? c : 0.5);
          }, 0) / nodes.length
        : null;

    const lines = [
      `HENKILÖKOHTAINEN OPISKELUPOLKU (HOPS) — luonnos`,
      `Generoitu: ${new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' })}`,
      ``,
      `Opiskelija: ${learner.name}`,
      `Sähköposti: ${learner.email || '—'}`,
      `Äidinkieli: ${learner.mother_tongue || '—'}`,
      `Arvioitu taso (CEFR): ${learner.cefr_level || '—'}`,
      `Harjoituskertoja (järjestelmä): ${sessionCount}`,
      avgConf != null ? `Aivograafi: keskim. varmuus ${(avgConf * 100).toFixed(0)}% (${nodes.length} nodea)` : '',
      ``,
      `Tavoite (120 pv): kohti työelämän suomea ja tarvittaessa YKI keskitaso.`,
      ``,
      `Viimeisimmät sessiot:`,
      ...titles.map((t) => ` • ${t}`),
      ``,
      `Seuraavat askeleet (muokkaa vapaasti):`,
      ` 1. Vahvista taso ja tavoitteet yhdessä opiskelijan kanssa.`,
      ` 2. Valitse moduulipainotus (työ / arki / YKI) jatkoviikoille.`,
      ` 3. Sovi työssäoppimisen ajankohta ja ohjaaja.`,
      ` 4. Kirjaa tuki ja seuranta (viikoittainen check-in).`,
      ``,
      `Allekirjoitus: _________________   Päivä: _______`,
    ].filter(Boolean);

    const draft = lines.join('\n');

    try {
      await query(
        `UPDATE learners SET hops_draft = $1, hops_draft_at = NOW() WHERE id = $2`,
        [draft, learnerId]
      );
    } catch (e) {
      /* columns may not exist */
      if (!String(e.message || '').includes('hops_draft')) throw e;
    }

    sendJson(res, 200, { ok: true, draft, learner_id: learnerId });
  } catch (err) {
    console.error('HOPS draft:', err);
    sendJson(res, 500, { error: err.message || 'HOPS draft failed' });
  }
}

export async function placementsHandler(req, res, learnerId) {
  if (!requireTeacher(req, res)) return;
  const orgId = req.user.org_id || null;

  if (req.method === 'GET' && !learnerId) {
    try {
      const r = await query(
        `SELECT lp.*, l.name AS learner_name, l.email AS learner_email
         FROM learner_placements lp
         JOIN learners l ON l.id = lp.learner_id
         ${orgId ? 'WHERE l.org_id = $1' : ''}
         ORDER BY l.name`,
        orgId ? [orgId] : []
      );
      return sendJson(res, 200, { placements: r.rows || [] });
    } catch (e) {
      if (e.code === '42P01') return sendJson(res, 200, { placements: [], hint: 'Run migration 006-teacher-workflow.sql' });
      throw e;
    }
  }

  if (req.method === 'PATCH' && learnerId) {
    const b = req.body || {};
    const lw = orgId ? 'id = $1 AND (org_id = $2 OR org_id IS NULL)' : 'id = $1';
    const lp = orgId ? [learnerId, orgId] : [learnerId];
    const ok = await query(`SELECT 1 FROM learners WHERE ${lw}`, lp);
    if (!ok.rows.length) return sendJson(res, 404, { error: 'Learner not found' });

    try {
      await query(
        `INSERT INTO learner_placements (
           learner_id, status, employer_name, employer_contact, start_date, end_date, briefing_at, feedback_at, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (learner_id) DO UPDATE SET
           status = EXCLUDED.status,
           employer_name = EXCLUDED.employer_name,
           employer_contact = EXCLUDED.employer_contact,
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           briefing_at = EXCLUDED.briefing_at,
           feedback_at = EXCLUDED.feedback_at,
           notes = EXCLUDED.notes,
           updated_at = NOW()`,
        [
          learnerId,
          b.status || 'not_started',
          b.employer_name ?? null,
          b.employer_contact ?? null,
          b.start_date || null,
          b.end_date || null,
          b.briefing_at || null,
          b.feedback_at || null,
          b.notes ?? null,
        ]
      );
    } catch (e) {
      if (e.code === '42P01') return sendJson(res, 503, { error: 'learner_placements table missing — run migration 006' });
      throw e;
    }
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 405, { error: 'Method not allowed' });
}

export async function reportsPreviewHandler(req, res) {
  if (!requireTeacher(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'GET only' });
  /* Re-use workflow aggregates — client can call /api/teacher/workflow instead */
  return getWorkflowHandler(req, res);
}

export default async function teacherWorkflowRouter(req, res, pathSegs) {
  const sub = pathSegs[2];
  if (!sub) return getWorkflowHandler(req, res);
  if (sub === 'hops-draft' && req.method === 'POST') return postHopsDraftHandler(req, res);
  if (sub === 'placements') {
    const lid = pathSegs[3];
    return placementsHandler(req, res, lid);
  }
  if (sub === 'reports' && pathSegs[3] === 'preview' && req.method === 'GET') return reportsPreviewHandler(req, res);
  sendJson(res, 404, { error: 'Not found' });
}
