// GET /api/brain/stats — XP, streak, level for authenticated learner
import { query } from './db.js';

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

  try {
    const [learnerResult, episodesResult] = await Promise.all([
      query(`SELECT cefr_level, name FROM learners WHERE id = $1`, [learnerId]),
      query(
        `SELECT created_at, duration_s FROM episodes
         WHERE learner_id = $1 ORDER BY created_at DESC`,
        [learnerId]
      ),
    ]);

    const learner = learnerResult.rows?.[0];
    const episodes = episodesResult.rows || [];
    const level = learner?.cefr_level || 'A1';

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const xpWeek = episodes
      .filter((e) => new Date(e.created_at) >= weekAgo)
      .reduce((sum, e) => sum + Math.min((e.duration_s || 0) / 60 * 50, 100), 0);

    const dates = [...new Set(episodes.map((e) => (e.created_at || '').slice(0, 10)))].sort().reverse();
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
    }));
  } catch (err) {
    console.error('brain/stats error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
