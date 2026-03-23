// GET/POST /api/cron-weekly — weekly learner digest via Resend (Vercel cron)
import { Resend } from 'resend';
import { query } from './db.js';

const FROM_EMAIL = process.env.RESEND_FROM || 'Knuut <onboarding@resend.dev>';
const CRON_SECRET = process.env.CRON_SECRET;

async function sendWeeklyDigests() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not set');
    return { sent: 0, error: 'RESEND_API_KEY not set' };
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const learners = await query(`
    SELECT l.id, l.name, l.email,
           COUNT(e.id)::int as session_count,
           (SELECT bn.label FROM brain_nodes bn
            WHERE bn.type IN ('Skill','Memory')
              AND (bn.metadata->>'learner_id' = l.id::text OR bn.metadata->>'learner_id' IS NULL)
            ORDER BY COALESCE((bn.metadata->>'confidence_score')::float, 0.5) ASC
            LIMIT 1) as weakest_topic
    FROM learners l
    LEFT JOIN episodes e ON e.learner_id = l.id AND e.created_at >= $1
    WHERE l.email IS NOT NULL AND l.email != ''
    GROUP BY l.id
  `, [weekAgo]);

  let sent = 0;
  for (const learner of learners.rows) {
    if (!learner.email) continue;
    const count = learner.session_count || 0;
    const topic = learner.weakest_topic || 'general vocabulary';
    const exercise = `Practice "${topic}" for 2 minutes: ask Knuut to have a short conversation about ${topic}. Say 3–5 sentences.`;
    const html = `
      <h2>Hello ${learner.name}!</h2>
      <p>This week you completed <strong>${count}</strong> session${count !== 1 ? 's' : ''} with Knuut.</p>
      ${count === 0 ? '<p>Start a session to build your Finnish skills!</p>' : ''}
      ${topic && topic !== 'general vocabulary' ? `
      <p>Your weakest topic right now: <strong>${topic}</strong>.</p>
      <p><strong>2-minute exercise:</strong> ${exercise}</p>
      ` : '<p>Keep practicing with Knuut!</p>'}
      <p><a href="https://suvisbrain.vercel.app/knuut.html">Practice now →</a></p>
      <p style="color:#888;font-size:12px">— Knuut AI</p>
    `;
    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: learner.email,
        subject: `Knuut weekly: ${count} session${count !== 1 ? 's' : ''} this week`,
        html,
      });
      if (!error) sent++;
      else console.error('Resend error for', learner.email, error);
    } catch (err) {
      console.error('Send failed', learner.email, err);
    }
  }
  return { sent, total: learners.rows.length };
}

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

  try {
    const result = await sendWeeklyDigests();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...result }));
  } catch (err) {
    console.error('cron-weekly error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
