// GET/POST /api/cron-weekly — weekly learner digest via Resend (Vercel cron)
import { query } from './db.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const RESEND_URL = 'https://api.resend.com/emails';

const MODELS = [
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free',
  'google/gemma-3-4b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-27b-it:free',
];

const KEYS = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2,
].filter(Boolean);

// STEP 1 — Get all active learners
async function getActiveLearners() {
  const result = await query(`
    SELECT l.id, l.name, l.email, l.cefr_level, l.mother_tongue
    FROM learners l
    WHERE l.email IS NOT NULL AND l.email != ''
    AND EXISTS (
      SELECT 1 FROM episodes e
      WHERE e.learner_id = l.id
      AND e.created_at > NOW() - INTERVAL '7 days'
    )
  `);
  return result.rows;
}

// STEP 2 — Gather week stats for a learner
async function getLearnerStats(learnerId) {
  const [xpResult, skillsResult, streakResult] = await Promise.all([
    // XP: SUM of MIN(duration_s/60*50, 100) for episodes this week
    query(`
      SELECT COALESCE(SUM(
        LEAST(GREATEST(COALESCE(duration_s, 0)::float / 60 * 50, 0), 100)
      ), 0)::int as xp
      FROM episodes
      WHERE learner_id = $1 AND created_at > NOW() - INTERVAL '7 days'
    `, [learnerId]),
    // Top 3 skills: brain_nodes type='Skill', learner or global, by confidence
    query(`
      SELECT label,
        COALESCE((metadata->>'confidence_score')::float, 0) * 100 as confidence_pct
      FROM brain_nodes
      WHERE type = 'Skill'
      AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
      ORDER BY COALESCE((metadata->>'confidence_score')::float, 0) DESC
      LIMIT 3
    `, [learnerId]),
    // Distinct episode dates for streak (last 60 days)
    query(`
      SELECT DISTINCT DATE(created_at) as d
      FROM episodes
      WHERE learner_id = $1 AND created_at > NOW() - INTERVAL '60 days'
      ORDER BY d DESC
    `, [learnerId]),
  ]);

  const xp = Number(xpResult.rows[0]?.xp) || 0;
  const sessions = await query(
    `SELECT COUNT(*)::int as c FROM episodes
     WHERE learner_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
    [learnerId]
  ).then(r => Number(r.rows[0]?.c) || 0);

  const skills = (skillsResult.rows || []).map(row => ({
    label: row.label || 'Skill',
    confidence: Math.round(Number(row.confidence_pct) || 0),
  }));

  // Streak: consecutive days with at least one episode
  const dates = (streakResult.rows || []).map(r => r.d);
  let streak = 0;
  if (dates.length > 0) {
    const dateStrs = dates.map(d => (typeof d === 'string' ? d : d?.toISOString?.()?.slice(0, 10))).filter(Boolean);
    streak = 1;
    for (let i = 1; i < dateStrs.length; i++) {
      const prev = new Date(dateStrs[i - 1]);
      const curr = new Date(dateStrs[i]);
      const diffDays = Math.round((prev - curr) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) streak++;
      else break;
    }
  }

  return { xp, sessions, skills, streak };
}

// STEP 3 — Generate encouragement via OpenRouter
async function getEncouragement(name, sessions, mother_tongue) {
  const lang = mother_tongue || 'English';
  const prompt = `Write one short encouraging sentence (max 15 words) from Knuut, a friendly Finnish language tutor, to a learner named ${name} who has done ${sessions} sessions this week. Write in ${lang} if possible, otherwise English. Return only the sentence, nothing else.`;

  for (const model of MODELS) {
    for (const key of KEYS) {
      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://suvisbrain.vercel.app',
          },
          body: JSON.stringify({
            model,
            max_tokens: 80,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        const data = await response.json();
        if (data.error) {
          console.log(`Model ${model}: ${data.error.message}`);
          continue;
        }
        const text = (data.choices?.[0]?.message?.content || '').trim();
        if (text) return text;
      } catch (err) {
        console.log(`Model ${model} failed:`, err.message);
      }
    }
  }
  return "Keep up the great work — every session brings you closer to fluency!";
}

// STEP 4 — Build email HTML
function buildEmailHTML(learner, stats, encouragement) {
  const { name, cefr_level } = learner;
  const { xp, sessions, skills, streak } = stats;
  const xpPct = Math.min(100, Math.round((xp / 500) * 100));

  const skillsList = skills.length
    ? skills.map(s => `<li><strong>${escapeHtml(s.label)}</strong> — ${s.confidence}%</li>`).join('')
    : '<li>No skills tracked yet — keep practicing!</li>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <h1 style="margin:0 0 24px;color:#1d9e75;font-size:24px">Knuut AI</h1>
    <p style="margin:0 0 24px;font-size:18px">Hi ${escapeHtml(name)}!</p>

    <p style="margin:0 0 8px;font-size:14px;color:#666">XP this week</p>
    <p style="margin:0 0 12px;font-size:36px;font-weight:700;color:#1d9e75">${xp} <span style="font-size:18px;font-weight:400;color:#999">/ 500 XP goal</span></p>
    <div style="height:8px;background:#e8e8e8;border-radius:4px;overflow:hidden;margin-bottom:24px">
      <div style="height:100%;width:${xpPct}%;background:#1d9e75;border-radius:4px"></div>
    </div>

    <p style="margin:0 0 16px;font-size:16px"><strong>Your streak:</strong> ${streak} day${streak !== 1 ? 's' : ''}</p>

    <p style="margin:0 0 8px;font-size:16px"><strong>Top skills this week:</strong></p>
    <ul style="margin:0 0 24px;padding-left:20px">
      ${skillsList}
    </ul>

    <p style="margin:0 0 24px;font-style:italic;color:#555">${escapeHtml(encouragement)}</p>

    <a href="https://suvis-brain.vercel.app/knuut.html" style="display:inline-block;padding:14px 28px;background:#1d9e75;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">Continue learning →</a>

    <p style="margin:32px 0 0;font-size:12px;color:#999">Knuut AI by HSBRIDGE AI · Kajaani, Finland</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// STEP 4 — Send email via Resend (fetch)
async function sendEmail(learner, stats, encouragement) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Knuut <onboarding@resend.dev>';

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: learner.email,
      subject: `Your Finnish progress this week, ${learner.name} 🇫🇮`,
      html: buildEmailHTML(learner, stats, encouragement),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText || 'Resend API error');
  }
}

const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (CRON_SECRET && token !== CRON_SECRET) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GET or POST only' }));
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'RESEND_API_KEY not set' }));
    return;
  }

  try {
    const learners = await getActiveLearners();
    let emailsSent = 0;

    for (const learner of learners) {
      try {
        const stats = await getLearnerStats(learner.id);
        const encouragement = await getEncouragement(
          learner.name,
          stats.sessions,
          learner.mother_tongue
        );
        await sendEmail(learner, stats, encouragement);
        emailsSent++;
      } catch (err) {
        console.error(`cron-weekly: failed for ${learner.email}:`, err.message);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      emails_sent: emailsSent,
      learners_processed: learners.length,
    }));
  } catch (err) {
    console.error('cron-weekly error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
