// POST /api/session — OpenAI Realtime voice (Knuut AI). Requires auth.
import { getSystemPrompt, langToIso } from './knuut-prompt.js';
import { query } from './db.js';

export default async function handler(req, res, body) {
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed');
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: 'Something went wrong' });
      return;
    }

    const offerSdp = (body && body.sdp) ? String(body.sdp) : (typeof body === 'string' ? body : '');
    if (!offerSdp) {
      res.status(400).json({ error: 'Missing SDP offer' });
      return;
    }

    const mode = ((body && body.mode) || 'regular').toLowerCase() === 'yki' ? 'yki' : 'regular';
    const dashboardMode = (body && body.dashboard_mode) || null;
    const reviewWords = Array.isArray(body && body.review_words) ? body.review_words : [];
    const focusTopics = Array.isArray(body && body.focusTopics) ? body.focusTopics : [];

    let learnerId = null;
    if (req.user.role === 'learner') {
      learnerId = req.user.id;
    } else if (req.user.role === 'teacher' && body && body.learner_id) {
      learnerId = body.learner_id;
    }

    let learnerCefr = null;
    let nativeLanguage = null;
    let learnerName = null;
    let isFirstSession = false;
    let lastEpisode = null;
    let brainNodes = [];

    if (learnerId) {
      try {
        const [learnerResult, lastEpisodeResult, brainResult] = await Promise.all([
          query(
            `SELECT name, cefr_level, mother_tongue,
                    (SELECT COUNT(*) FROM episodes WHERE learner_id = $1) AS session_count
             FROM learners WHERE id = $2`,
            [learnerId, learnerId]
          ),
          query(
            `SELECT title, summary, raw_transcript, created_at
             FROM episodes WHERE learner_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [learnerId]
          ),
          query(
            `SELECT label, type,
                    (metadata->>'confidence_score')::float as confidence_score,
                    metadata
             FROM brain_nodes
             WHERE type IN ('Skill', 'Memory', 'Conversation')
               AND (metadata->>'learner_id' = $1 OR metadata->>'learner_id' IS NULL)
             ORDER BY COALESCE((metadata->>'confidence_score')::float, 0.5) ASC`,
            [learnerId]
          ),
        ]);
        if (learnerResult.rows && learnerResult.rows[0]) {
          const row = learnerResult.rows[0];
          learnerName = row.name || null;
          learnerCefr = row.cefr_level || null;
          nativeLanguage = row.mother_tongue ? langToIso(row.mother_tongue) : null;
          isFirstSession = parseInt(row.session_count, 10) === 0;
        }
        if (lastEpisodeResult.rows && lastEpisodeResult.rows[0]) {
          lastEpisode = lastEpisodeResult.rows[0];
        }
        if (brainResult.rows && brainResult.rows.length > 0) {
          brainNodes = brainResult.rows.map((r) => ({
            label: r.label,
            type: r.type,
            confidence: r.confidence_score != null ? r.confidence_score : 0.5,
            metadata: r.metadata || {},
          }));
        }
      } catch (err) {
        console.error('[voice] Could not fetch learner profile:', err.message);
      }
    }

    const systemPrompt = getSystemPrompt({
      mode,
      dashboardMode,
      reviewWords,
      focusTopics,
      learnerCefr,
      nativeLanguage,
      learnerName,
      lastEpisode,
      brainNodes,
      isFirstSession,
    });

    const createResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-realtime-1.5',
        voice: 'verse',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        instructions: systemPrompt,
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.text();
      console.error('[voice] Session create failed:', err.slice(0, 200));
      res.status(createResp.status).json({ error: 'Something went wrong' });
      return;
    }

    const sessData = await createResp.json();
    const sessionId = sessData.id;
    const apiUrl = 'https://api.openai.com/v1/realtime?model=gpt-realtime-1.5&session=' + encodeURIComponent(sessionId);
    const oaiResp = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: offerSdp,
    });

    if (!oaiResp.ok) {
      const err = await oaiResp.text();
      console.error('[voice] SDP exchange failed:', err.slice(0, 200));
      res.status(oaiResp.status).json({ error: 'Something went wrong' });
      return;
    }

    const answerSdp = await oaiResp.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Session-Id', sessionId);
    res.status(200).end(JSON.stringify({ answer: answerSdp, instructions: systemPrompt }));
  } catch (err) {
    console.error('[voice]', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
