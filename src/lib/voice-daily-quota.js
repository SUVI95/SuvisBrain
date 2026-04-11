/**
 * Server-side daily voice allowance per learner — calendar day in Europe/Helsinki, no rollover.
 * Cap defaults to 30 minutes; override with VOICE_DAILY_CAP_SECONDS. Disable checks with VOICE_DAILY_QUOTA_DISABLED=1.
 */
import { query, isDatabaseConfigured } from '../../api/db.js';

export function getDailyCapSeconds() {
  const raw = process.env.VOICE_DAILY_CAP_SECONDS;
  if (raw == null || String(raw).trim() === '') return 30 * 60;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 30 * 60;
}

export function isVoiceDailyQuotaEnabled() {
  const v = process.env.VOICE_DAILY_QUOTA_DISABLED;
  return !(v === '1' || v === 'true' || v === 'yes');
}

/** YYYY-MM-DD in Europe/Helsinki for the given instant */
export function getHelsinkiDateKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const day = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${day}`;
}

/**
 * @param {string|null|undefined} learnerId
 * @returns {Promise<{ applies: boolean, secondsUsed: number, remainingSeconds: number, capSeconds: number, usageDate: string }>}
 */
export async function getVoiceQuotaForLearner(learnerId) {
  const cap = getDailyCapSeconds();
  if (!isVoiceDailyQuotaEnabled() || !isDatabaseConfigured() || !learnerId) {
    return {
      applies: false,
      secondsUsed: 0,
      remainingSeconds: cap,
      capSeconds: cap,
      usageDate: getHelsinkiDateKey(),
    };
  }

  const usageDate = getHelsinkiDateKey();
  try {
    const r = await query(
      `SELECT seconds_used FROM learner_voice_daily_usage WHERE learner_id = $1 AND usage_date = $2::date`,
      [learnerId, usageDate]
    );
    const used = r.rows[0] ? parseInt(r.rows[0].seconds_used, 10) || 0 : 0;
    const remaining = Math.max(0, cap - used);
    return {
      applies: true,
      secondsUsed: used,
      remainingSeconds: remaining,
      capSeconds: cap,
      usageDate,
    };
  } catch (e) {
    console.error('[voice-quota] getVoiceQuotaForLearner:', e.message);
    throw e;
  }
}

/**
 * @param {string|null|undefined} learnerId
 * @returns {Promise<object>} quota snapshot
 * @throws {Error} code VOICE_DAILY_QUOTA_EXCEEDED, statusCode 403
 */
export async function assertVoiceSessionAllowed(learnerId) {
  const q = await getVoiceQuotaForLearner(learnerId);
  if (!q.applies) return q;
  if (q.remainingSeconds <= 0) {
    const err = new Error('Daily voice practice limit reached for today (Europe/Helsinki).');
    err.code = 'VOICE_DAILY_QUOTA_EXCEEDED';
    err.statusCode = 403;
    err.quota = q;
    throw err;
  }
  return q;
}

/**
 * Add completed voice seconds for a learner (Helsinki “today”). Idempotent-friendly; totals capped at daily cap.
 * @param {string|null|undefined} learnerId
 * @param {number} seconds
 */
export async function addVoiceSecondsForLearner(learnerId, seconds) {
  if (!isVoiceDailyQuotaEnabled() || !isDatabaseConfigured() || !learnerId) return;
  const add = Math.max(0, Math.floor(Number(seconds) || 0));
  if (add <= 0) return;

  const cap = getDailyCapSeconds();
  const usageDate = getHelsinkiDateKey();

  try {
    await query(
      `INSERT INTO learner_voice_daily_usage (learner_id, usage_date, seconds_used)
       VALUES ($1::uuid, $2::date, LEAST($3::int, $4::int))
       ON CONFLICT (learner_id, usage_date)
       DO UPDATE SET
         seconds_used = LEAST($4::int, learner_voice_daily_usage.seconds_used + $3::int),
         updated_at = now()`,
      [learnerId, usageDate, add, cap]
    );
  } catch (e) {
    console.error('[voice-quota] addVoiceSecondsForLearner:', e.message);
  }
}
