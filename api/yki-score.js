// POST /api/yki-score — YKI exam transcript analysis; GET for fetching by episode_id
import { query } from './db.js';
import { removePersonalData } from '../src/lib/safe-ai.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function scoreYkiTranscript(transcript) {
  const safeInput = removePersonalData(transcript || '');
  const prompt = `You are a certified YKI (Yleinen kielitutkinto) examiner.
Analyse this speaking exam transcript and return ONLY valid JSON.

Transcript:
${safeInput}

Return exactly this structure:
{
  "cefr_level": "B1",
  "yki_result": "pass",
  "overall_score": 72,
  "section_scores": {
    "fluency": 70,
    "vocabulary": 75,
    "grammar": 68,
    "pronunciation": 74,
    "task_completion": 80
  },
  "strengths": ["Good use of connectors", "Clear pronunciation"],
  "weaknesses": ["Partitive case errors", "Limited subordinate clauses"],
  "recommendations": [
    "Practice partitive with numbers daily",
    "Learn 10 new workplace words per week",
    "Listen to YLE Uutiset selkosuomeksi"
  ],
  "predicted_real_yki": "pass",
  "examiner_notes": "Candidate shows solid B1 foundations..."
}

Scoring: 0-100. Pass threshold: 60. Distinction: 80+.
cefr_level options: A1, A2, B1, B2
yki_result options: fail, pass, pass_with_distinction`;

  const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_2;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');

  const res = await fetch(OPENROUTER_URL, {
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
  const data = await res.json();
  const text = ((data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '{}').replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

export default async function ykiScoreHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const url = new URL(req.url || '/', 'http://localhost');
    const episodeId = url.searchParams.get('episode');
    if (!episodeId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'episode query param required' }));
      return;
    }
    try {
      const r = await query(
        `SELECT e.id, e.title, e.summary, e.metadata, e.raw_transcript, e.learner_id, l.name as learner_name
         FROM episodes e
         LEFT JOIN learners l ON l.id = e.learner_id
         WHERE e.id = $1`,
        [episodeId]
      );
      if (r.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Episode not found' }));
        return;
      }
      const ep = r.rows[0];
      const meta = ep.metadata || {};
      const score = meta.yki_score;
      if (score) {
        const out = { ...score, learner_name: ep.learner_name };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
        return;
      }
      if (ep.raw_transcript && ep.raw_transcript.length > 100) {
        const scoreResult = await scoreYkiTranscript(ep.raw_transcript);
        await query(
          `UPDATE episodes SET metadata = jsonb_set(jsonb_set(COALESCE(metadata, '{}'), '{yki_score}', $1::jsonb), '{is_yki_exam}', 'true') WHERE id = $2`,
          [JSON.stringify(scoreResult), episodeId]
        );
        const out = { ...scoreResult, learner_name: ep.learner_name };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
        return;
      }
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No YKI score for this episode' }));
    } catch (err) {
      console.error('yki-score GET error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST') {
    const { transcript, learner_id, episode_id } = req.body || {};
    if (!transcript || transcript.length < 50) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Transcript too short' }));
      return;
    }
    try {
      const scoreResult = await scoreYkiTranscript(transcript);
      if (episode_id) {
        try {
          await query(
            `UPDATE episodes SET metadata = jsonb_set(jsonb_set(COALESCE(metadata, '{}'), '{yki_score}', $1::jsonb), '{is_yki_exam}', 'true') WHERE id = $2`,
            [JSON.stringify(scoreResult), episode_id]
          );
        } catch (e) {
          console.warn('Episode metadata update failed:', e);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(scoreResult));
    } catch (err) {
      console.error('yki-score POST error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'GET or POST only' }));
}
