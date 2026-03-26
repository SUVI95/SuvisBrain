// api/teacher-dashboard.js — teacher command center data + nudge flows
import { query } from './db.js';
import { parseSchemaMissing } from '../src/lib/security.js';

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

function avgMinutes(episodes) {
  if (!episodes.length) return 0;
  const total = episodes.reduce((sum, e) => sum + ((e.duration_s || 0) / 60), 0);
  return Math.round((total / episodes.length) * 10) / 10;
}

function recentWindowDays(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (24 * 60 * 60 * 1000));
}

function buildLearnerInsights(learner, episodes, topicRows) {
  const sessionsTotal = learner.sessions_total || 0;
  const sessionsWeek = learner.sessions_this_week || 0;
  const streak = learner.streak || 0;
  const lastAt = learner.last_session_at;
  const daysSinceLast = recentWindowDays(lastAt);
  const recentEpisodes = (episodes || []).slice(0, 3);
  const allEpisodes = episodes || [];
  const recentAvg = avgMinutes(recentEpisodes);
  const overallAvg = avgMinutes(allEpisodes);
  const shorterRecently = recentEpisodes.length >= 2 && overallAvg > 0 && recentAvg < overallAvg * 0.7;
  const repeatedTopics = (topicRows || []).filter((t) => (t.count || 0) >= 2).slice(0, 3);
  const weakestTopics = repeatedTopics.map((t) => t.topic).filter(Boolean);
  const needsAttention = learner.at_risk || sessionsWeek === 0 || (daysSinceLast != null && daysSinceLast >= 5);
  const confidenceRisk = shorterRecently && sessionsWeek > 0;
  const hiddenProgress = !learner.at_risk && streak >= 2 && sessionsWeek >= 1 && recentAvg >= Math.max(8, overallAvg * 0.85);
  const readyForChallenge = ['A1', 'A2'].includes((learner.cefr_level || 'A1').toUpperCase()) && sessionsTotal >= 6 && !learner.at_risk;

  const reasons = [];
  if (learner.at_risk) reasons.push(`No practice for ${Math.max(daysSinceLast || 7, 7)} days`);
  if (sessionsWeek === 0 && !learner.at_risk) reasons.push('No sessions yet this week');
  if (confidenceRisk) reasons.push('Recent sessions are shorter than usual');
  if (streak >= 3) reasons.push(`Strong routine with a ${streak}-day streak`);
  if (readyForChallenge) reasons.push('Steady activity suggests readiness for the next challenge');
  if (weakestTopics.length) reasons.push(`Repeated friction around ${weakestTopics.join(', ')}`);
  if (hiddenProgress) reasons.push('Consistency is improving even without dramatic volume spikes');

  let priorityScore = 0;
  priorityScore += learner.at_risk ? 100 : 0;
  priorityScore += confidenceRisk ? 30 : 0;
  priorityScore += sessionsWeek === 0 ? 20 : 0;
  priorityScore += daysSinceLast != null ? Math.min(daysSinceLast * 2, 30) : 10;
  priorityScore -= hiddenProgress ? 15 : 0;
  priorityScore -= readyForChallenge ? 10 : 0;
  priorityScore -= streak >= 5 ? 10 : 0;

  const suggestionType = learner.at_risk
    ? 'nudge'
    : confidenceRisk
      ? 'confidence_support'
      : readyForChallenge
        ? 'challenge'
        : hiddenProgress
          ? 'celebrate'
          : 'review';

  const suggestions = {
    nudge: {
      title: 'Gentle re-engagement',
      teacher_action: 'Review and send a short encouragement nudge',
      draft: `Hi ${learner.name || 'there'} — you have already built good momentum in Finnish. A short 10-minute practice this week would help you keep it going.`,
      rationale: 'Best for learners who have gone quiet and may benefit from low-pressure re-entry.',
      effort: 'low',
      confidence: 0.87,
    },
    confidence_support: {
      title: 'Confidence rebuild',
      teacher_action: 'Offer one easy win topic before harder material',
      draft: `I noticed you have still been showing up. Let’s keep it simple this week and focus on one practical topic you can succeed with quickly.`,
      rationale: 'Shorter recent sessions can mean overwhelm rather than low motivation.',
      effort: 'medium',
      confidence: 0.74,
    },
    challenge: {
      title: 'Ready for next challenge',
      teacher_action: 'Approve a slightly harder topic or speaking task',
      draft: `You are doing well. This could be a good time to try a slightly more demanding practice task so you can move toward the next level.`,
      rationale: 'Sustained session volume at A1/A2 often means the learner is ready to stretch.',
      effort: 'medium',
      confidence: 0.78,
    },
    celebrate: {
      title: 'Celebrate hidden progress',
      teacher_action: 'Send brief praise that reinforces consistency',
      draft: `You may not always notice it yourself, but your consistency is improving. That matters a lot, and it is helping your Finnish grow.`,
      rationale: 'Recognition helps teachers reinforce momentum that raw volume metrics can miss.',
      effort: 'low',
      confidence: 0.71,
    },
    review: {
      title: 'Targeted review',
      teacher_action: 'Prepare 1–2 focused review words/topics for the next session',
      draft: `For the next practice, I would keep the focus narrow and repeat one or two practical topics until they feel easier.`,
      rationale: 'A narrow teacher-led review can reduce cognitive load and improve retention.',
      effort: 'medium',
      confidence: 0.68,
    },
  };

  const teacherMemory = [];
  if (weakestTopics.length) teacherMemory.push(`Needs support around: ${weakestTopics.join(', ')}`);
  if (hiddenProgress) teacherMemory.push('Responds to consistency and routine-building');
  if (confidenceRisk) teacherMemory.push('May need confidence-building rather than harder material');
  if (readyForChallenge) teacherMemory.push('Could be ready for more demanding speaking or workplace tasks');

  return {
    priority_score: priorityScore,
    needs_attention: needsAttention,
    confidence_risk: confidenceRisk,
    hidden_progress: hiddenProgress,
    ready_for_challenge: readyForChallenge,
    weakest_topics: weakestTopics,
    repeated_topic_count: repeatedTopics.length,
    reasons,
    suggestion: suggestions[suggestionType],
    teacher_memory: teacherMemory,
    quick_actions: [
      suggestions[suggestionType].teacher_action,
      weakestTopics.length ? `Review ${weakestTopics[0]}` : 'Review one practical topic',
      learner.at_risk ? 'Send nudge now' : 'Discuss next session goal',
    ],
    trend: {
      recent_avg_minutes: recentAvg,
      overall_avg_minutes: overallAvg,
      days_since_last: daysSinceLast,
    },
  };
}

function buildTeacherBrief(learners) {
  const urgent = learners.filter((l) => l.ai_insights?.needs_attention).sort((a, b) => (b.ai_insights?.priority_score || 0) - (a.ai_insights?.priority_score || 0)).slice(0, 3);
  const hiddenProgress = learners.filter((l) => l.ai_insights?.hidden_progress).slice(0, 3);
  const ready = learners.filter((l) => l.ai_insights?.ready_for_challenge).slice(0, 3);
  const confidenceRisk = learners.filter((l) => l.ai_insights?.confidence_risk).slice(0, 3);

  const sections = [];
  if (urgent.length) {
    sections.push({
      key: 'urgent',
      title: 'Needs your attention today',
      tone: 'risk',
      items: urgent.map((l) => ({
        learner_id: l.id,
        learner_name: l.name,
        summary: l.ai_insights?.reasons?.[0] || 'Needs review',
        action: l.ai_insights?.suggestion?.teacher_action || 'Review learner',
      })),
    });
  }
  if (confidenceRisk.length) {
    sections.push({
      key: 'confidence',
      title: 'Possible confidence dips',
      tone: 'warn',
      items: confidenceRisk.map((l) => ({
        learner_id: l.id,
        learner_name: l.name,
        summary: 'Recent sessions are shorter than usual',
        action: 'Offer an easier win before increasing difficulty',
      })),
    });
  }
  if (hiddenProgress.length) {
    sections.push({
      key: 'progress',
      title: 'Hidden progress worth reinforcing',
      tone: 'good',
      items: hiddenProgress.map((l) => ({
        learner_id: l.id,
        learner_name: l.name,
        summary: 'Consistency is improving even if the gains are subtle',
        action: 'Consider brief praise or a light challenge',
      })),
    });
  }
  if (ready.length) {
    sections.push({
      key: 'ready',
      title: 'Ready for the next challenge',
      tone: 'good',
      items: ready.map((l) => ({
        learner_id: l.id,
        learner_name: l.name,
        summary: 'Steady activity suggests they can stretch further',
        action: 'Approve a harder topic or speaking task',
      })),
    });
  }

  const headline = urgent.length
    ? `${urgent.length} learner${urgent.length === 1 ? '' : 's'} likely need teacher attention today`
    : hiddenProgress.length
      ? `Momentum looks healthier today — ${hiddenProgress.length} learner${hiddenProgress.length === 1 ? '' : 's'} show subtle progress`
      : 'No urgent intervention signals right now';

  return { headline, sections };
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
    let episodeRows = [];
    let topicRows = [];
    if (learnerIds.length) {
      const placeholders = learnerIds.map((_, i) => `$${i + 1}`).join(', ');
      const [dr, er, tr] = await Promise.all([
        query(
          `SELECT learner_id, (created_at AT TIME ZONE 'UTC')::date::text AS d
           FROM episodes
           WHERE learner_id IN (${placeholders})
           GROUP BY learner_id, (created_at AT TIME ZONE 'UTC')::date`,
          learnerIds
        ),
        query(
          `SELECT learner_id, title, summary, duration_s, created_at
           FROM episodes
           WHERE learner_id IN (${placeholders})
           ORDER BY created_at DESC`,
          learnerIds
        ),
        query(
          `SELECT learner_id,
                  COALESCE(NULLIF(TRIM(title), ''), 'General practice') AS topic,
                  COUNT(*)::int AS count
           FROM episodes
           WHERE learner_id IN (${placeholders})
           GROUP BY learner_id, COALESCE(NULLIF(TRIM(title), ''), 'General practice')
           ORDER BY count DESC`,
          learnerIds
        ),
      ]);
      dateRows = dr.rows || [];
      episodeRows = er.rows || [];
      topicRows = tr.rows || [];
    }

    const datesByLearner = new Map();
    for (const row of dateRows) {
      if (!datesByLearner.has(row.learner_id)) datesByLearner.set(row.learner_id, []);
      datesByLearner.get(row.learner_id).push(row.d);
    }

    const episodesByLearner = new Map();
    for (const row of episodeRows) {
      if (!episodesByLearner.has(row.learner_id)) episodesByLearner.set(row.learner_id, []);
      episodesByLearner.get(row.learner_id).push(row);
    }

    const topicsByLearner = new Map();
    for (const row of topicRows) {
      if (!topicsByLearner.has(row.learner_id)) topicsByLearner.set(row.learner_id, []);
      topicsByLearner.get(row.learner_id).push(row);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const learners = (result.rows || []).map((r) => {
      const sessionsTotal = r.sessions_total ?? 0;
      const lastAt = r.last_session_at;
      const atRisk = !lastAt || new Date(lastAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const streak = streakFromDates(datesByLearner.get(r.id) || [], todayStr);
      const learner = {
        ...r,
        last_session_at: lastAt,
        streak,
        xp: sessionsTotal * 50,
        at_risk: atRisk,
      };
      learner.ai_insights = buildLearnerInsights(
        learner,
        episodesByLearner.get(r.id) || [],
        topicsByLearner.get(r.id) || []
      );
      return learner;
    }).sort((a, b) => (b.ai_insights?.priority_score || 0) - (a.ai_insights?.priority_score || 0));

    const totalLearners = learners.length;
    const activeThisWeek = learners.filter((l) => (l.sessions_this_week || 0) > 0).length;
    const atRiskCount = learners.filter((l) => l.at_risk).length;
    const totalSessionsThisWeek = learners.reduce((s, l) => s + (l.sessions_this_week || 0), 0);
    const avgSessionsPerActiveLearner =
      activeThisWeek > 0 ? Math.round((totalSessionsThisWeek / activeThisWeek) * 10) / 10 : 0;
    const aiPreparedActions = learners.filter((l) => l.ai_insights?.suggestion).length;
    const hiddenProgressCount = learners.filter((l) => l.ai_insights?.hidden_progress).length;
    const readyForChallengeCount = learners.filter((l) => l.ai_insights?.ready_for_challenge).length;

    sendJson(res, 200, {
      summary: {
        total_learners: totalLearners,
        active_this_week: activeThisWeek,
        at_risk_count: atRiskCount,
        total_sessions_this_week: totalSessionsThisWeek,
        avg_sessions_per_active_learner: avgSessionsPerActiveLearner,
        ai_prepared_actions: aiPreparedActions,
        hidden_progress_count: hiddenProgressCount,
        ready_for_challenge_count: readyForChallengeCount,
      },
      teacher_brief: buildTeacherBrief(learners),
      learners,
    });
  } catch (err) {
    console.error('GET /api/teacher/learners:', err);
    const msg = err.message || 'Query failed';
    const hint =
      /org_id|teacher_reviewed|streak_freezes|column .* does not exist/i.test(msg)
        ? ' Hint: run src/data/ensure-all.sql and related migration scripts in Neon, then redeploy.'
        : '';

    const schemaInfo = parseSchemaMissing(msg);
    sendJson(res, 500, {
      error: msg + hint,
      code: schemaInfo?.code || 'INTERNAL_ERROR',
      details: schemaInfo?.details || {},
    });
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
