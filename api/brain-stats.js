// GET /api/brain/stats — XP, streak, level for authenticated learner
import { query } from './db.js';
import { parseSchemaMissing } from '../src/lib/security.js';

export default async function brainStatsHandler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'GET only' }));
  }
  const user = req.user;
  if (!user || user.role !== 'learner') {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }
  const learnerId = user.id;
  const orgId = user.org_id || null;

  try {
    const learnerWhere = orgId
      ? `id = $1 AND (org_id = $2 OR org_id IS NULL)`
      : `id = $1`;
    const episodeWhere = orgId
      ? `learner_id = $1 AND (org_id = $2 OR org_id IS NULL)`
      : `learner_id = $1`;
    const learnerParams = orgId ? [learnerId, orgId] : [learnerId];

    const [learnerResult, episodesResult] = await Promise.all([
      query(`SELECT cefr_level, name, COALESCE(streak_freezes_remaining, 2) as streak_freezes_remaining, COALESCE(streak_freezes_used, '[]'::jsonb) as streak_freezes_used FROM learners WHERE ${learnerWhere}`, learnerParams),
      query(
        `SELECT created_at, duration_s FROM episodes
         WHERE ${episodeWhere} ORDER BY created_at DESC`,
        learnerParams
      ),
    ]);

    const learner = learnerResult.rows?.[0];
    const episodes = episodesResult.rows || [];
    const level = learner?.cefr_level || 'A1';
    const freezesRemaining = Math.max(0, parseInt(learner?.streak_freezes_remaining) || 2);
    const raw = learner?.streak_freezes_used;
    const freezesUsed = Array.isArray(raw) ? raw.map((d) => (typeof d === 'string' ? d : d?.date || '')).filter(Boolean) : [];

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const xpWeek = episodes
      .filter((e) => new Date(e.created_at) >= weekAgo)
      .reduce((sum, e) => sum + Math.min((e.duration_s || 0) / 60 * 50, 100), 0);

    const episodeDates = [...new Set(episodes.map((e) => (e.created_at || '').slice(0, 10)))];
    const freezeDates = (freezesUsed || []).map((d) => (typeof d === 'string' ? d : d?.date || '')).filter(Boolean);
    const dates = [...new Set([...episodeDates, ...freezeDates])].sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < dates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const exp = expected.toISOString().slice(0, 10);
      if (dates.includes(exp)) streak++;
      else break;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      xp: Math.round(xpWeek),
      xp_goal: 500,
      streak,
      level,
      streak_freezes_remaining: freezesRemaining,
    }));
  } catch (err) {
    console.error('brain/stats error:', err);
    const msg = err.message || 'Query failed';
    const schemaInfo = parseSchemaMissing(msg);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: msg,
        code: schemaInfo?.code || 'INTERNAL_ERROR',
        details: schemaInfo?.details || {},
      })
    );
  }
}
