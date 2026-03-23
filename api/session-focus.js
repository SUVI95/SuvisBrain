// api/session-focus.js — what to teach NEXT session
import { query } from './db.js';

export default async function sessionFocusHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GET only' }));
    return;
  }

  try {
    const result = await query(`
      SELECT label, type,
             (metadata->>'confidence_score')::float as confidence_score,
             updated_at
      FROM brain_nodes
      WHERE type IN ('Skill', 'Memory')
        AND COALESCE((metadata->>'confidence_score')::float, 0.5) < 0.85
      ORDER BY 
        COALESCE((metadata->>'confidence_score')::float, 0.5) ASC,
        updated_at ASC NULLS FIRST
      LIMIT 5
    `);

    const focusTopics = result.rows.map((r) => ({
      label: r.label,
      type: r.type,
      confidence: r.confidence_score,
      priority: (r.confidence_score != null ? r.confidence_score : 0.5) < 0.4 ? 'urgent' : 'normal',
    }));

    const topicNames = focusTopics.map((t) => t.label).join(', ');
    const systemFragment =
      focusTopics.length > 0
        ? `Focus today's session on these topics the learner needs to practice: ${topicNames}. Do NOT spend time on topics the learner has already mastered.`
        : `The learner has mastered all current topics. Introduce new advanced vocabulary or YKI exam practice.`;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        focus_topics: focusTopics,
        system_prompt_fragment: systemFragment,
      })
    );
  } catch (err) {
    console.error('session-focus error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
