// api/session-complete.js — post-session brain update via OpenRouter
import { query } from './db.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function analyseTranscript(transcript) {
  const prompt = `You are analysing a Finnish language learning session transcript.
Extract learning data and return ONLY valid JSON, no other text.

Transcript:
${transcript}

Return this exact JSON structure:
{
  "summary": "2-3 sentence summary of the session in English",
  "topics_practiced": [
    { "label": "exact topic name", "confidence_delta": 0.1 }
  ],
  "topics_struggled": [
    { "label": "exact topic name", "confidence_delta": -0.05 }
  ],
  "new_topics": [
    { "label": "new topic encountered", "type": "Skill" }
  ],
  "cefr_level_demonstrated": "A1"
}

Rules:
- confidence_delta is always positive for practiced (0.05 to 0.2)
- confidence_delta is always negative for struggled (-0.05 to -0.1)
- type for new_topics must be one of: Skill, Memory, Conversation
- cefr_level_demonstrated must be one of: A1, A2, B1, B2, C1`;

  const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_2;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://suvisbrain.vercel.app',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

async function scoreCefrRubric(transcript) {
  const prompt = `You are a CEFR-certified assessor. Score this YKI mock speaking exam transcript against the CEFR rubric.

Transcript:
${transcript}

Return ONLY valid JSON:
{
  "cefr_level": "A1|A2|B1|B2|C1|C2",
  "brief_feedback": "1-2 sentences in English"
}

Apply CEFR criteria: range, accuracy, fluency, interaction. Be strict but fair.`;

  const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_2;
  if (!key) return null;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://suvisbrain.vercel.app',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function sessionCompleteHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  const { transcript, agent_id, duration_s, learner_language, learner_id, is_mock_exam } = req.body || {};

  if (!transcript || transcript.length < 50) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Transcript too short' }));
    return;
  }

  try {
    const analysis = await analyseTranscript(transcript);
    let cefrScore = null;
    if (is_mock_exam) {
      const scored = await scoreCefrRubric(transcript);
      cefrScore = scored?.cefr_level || analysis.cefr_level_demonstrated;
    }

    const title = is_mock_exam
      ? `YKI mock exam — ${new Date().toLocaleDateString('fi-FI')}`
      : `Session ${new Date().toLocaleDateString('fi-FI')}`;

    const episodeResult = await query(
      `INSERT INTO episodes (agent_id, learner_id, title, summary, language, duration_s, raw_transcript)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        agent_id ?? null,
        learner_id ?? null,
        title,
        analysis.summary,
        learner_language ?? 'fi',
        duration_s ?? 0,
        transcript,
      ]
    );
    const episodeId = episodeResult.rows[0].id;
    if (is_mock_exam && cefrScore) {
      try {
        await query(
          `UPDATE episodes SET metadata = $1::jsonb WHERE id = $2`,
          [JSON.stringify({ mock_exam: true, cefr_score: cefrScore }), episodeId]
        );
      } catch (_) { /* metadata column may not exist */ }
    }

    if (!is_mock_exam) {
    for (const topic of analysis.topics_practiced || []) {
      const delta = topic.confidence_delta;
      await query(
        `UPDATE brain_nodes
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'),
           '{confidence_score}',
           to_jsonb(LEAST(1.0::float, COALESCE((metadata->>'confidence_score')::float, 0.5) + $1))
         ),
         confidence_history = COALESCE(confidence_history, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('t', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'c', LEAST(1.0::float, COALESCE((metadata->>'confidence_score')::float, 0.5) + $1))
         ),
         updated_at = NOW()
         WHERE label ILIKE $2`,
        [delta, `%${topic.label}%`]
      );
    }

    for (const topic of analysis.topics_struggled || []) {
      const delta = topic.confidence_delta;
      await query(
        `UPDATE brain_nodes
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'),
           '{confidence_score}',
           to_jsonb(GREATEST(0.0::float, COALESCE((metadata->>'confidence_score')::float, 0.5) + $1))
         ),
         confidence_history = COALESCE(confidence_history, '[]'::jsonb) || jsonb_build_array(
           jsonb_build_object('t', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
             'c', GREATEST(0.0::float, COALESCE((metadata->>'confidence_score')::float, 0.5) + $1))
         ),
         updated_at = NOW()
         WHERE label ILIKE $2`,
        [delta, `%${topic.label}%`]
      );
    }

    }
    for (const topic of analysis.new_topics || []) {
      const existing = await query(
        `SELECT id FROM brain_nodes WHERE label ILIKE $1`,
        [`%${topic.label}%`]
      );
      if (existing.rows.length === 0) {
        const newNode = await query(
          `INSERT INTO brain_nodes (label, type, metadata)
           VALUES ($1, $2, $3) RETURNING id`,
          [
            topic.label,
            topic.type || 'Skill',
            JSON.stringify({ confidence_score: 0.3, source: 'session' }),
          ]
        );
        const core = await query(`SELECT id FROM brain_nodes WHERE type = 'Core' LIMIT 1`);
        if (core.rows.length > 0) {
          await query(
            `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
            [core.rows[0].id, newNode.rows[0].id]
          );
        }
      }
    }

    const payload = {
      success: true,
      episode_id: episodeId,
      summary: analysis.summary,
      topics_updated: is_mock_exam ? 0 : (analysis.topics_practiced?.length || 0) + (analysis.topics_struggled?.length || 0),
      new_nodes_created: is_mock_exam ? 0 : (analysis.new_topics?.length || 0),
      cefr_level: analysis.cefr_level_demonstrated,
    };
    if (is_mock_exam && cefrScore) payload.cefr_score = cefrScore;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  } catch (err) {
    console.error('session-complete error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
