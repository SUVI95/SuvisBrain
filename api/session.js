// POST /session — OpenAI Realtime voice (Knuut AI)
// Handles SDP exchange for WebRTC voice sessions
import { getSystemPrompt, langToIso } from './knuut-prompt.js';
import { query } from './db.js';

export default async function handler(req, res, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') {
    res.status(405).end('Method not allowed');
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      res.status(500).end('Missing OPENAI_API_KEY');
      return;
    }

    var offerSdp = '';
    if (body && typeof body === 'object' && body.sdp) {
      offerSdp = String(body.sdp || '');
    } else if (typeof body === 'string' && body) {
      offerSdp = body;
    }
    if (!offerSdp) {
      res.status(400).end('Missing SDP offer');
      return;
    }

    const learnerId = (body && body.learner_id) || null;
    const mode = ((body && body.mode) || 'regular').toLowerCase() === 'yki' ? 'yki' : 'regular';
    const focusTopics = Array.isArray(body && body.focusTopics) ? body.focusTopics : [];

    let learnerCefr = null;
    let nativeLanguage = null;
    let isFirstSession = false;

    if (learnerId) {
      try {
        const learnerResult = await query(
          `SELECT cefr_level, mother_tongue,
                  (SELECT COUNT(*) FROM episodes WHERE learner_id = $1) AS session_count
           FROM learners WHERE id = $2`,
          [learnerId, learnerId]
        );
        if (learnerResult.rows && learnerResult.rows[0]) {
          const row = learnerResult.rows[0];
          learnerCefr = row.cefr_level || null;
          nativeLanguage = row.mother_tongue ? langToIso(row.mother_tongue) : null;
          isFirstSession = parseInt(row.session_count, 10) === 0;
        }
      } catch (err) {
        console.error('[voice] Could not fetch learner profile:', err.message);
      }
    }

    const systemPrompt = getSystemPrompt({
      mode,
      focusTopics,
      learnerCefr,
      nativeLanguage,
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
        voice: 'cedar',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        instructions: systemPrompt,
      }),
    });

    if (!createResp.ok) {
      const err = await createResp.text();
      console.error('[voice] Session create failed:', err.slice(0, 200));
      res.status(createResp.status).end(err);
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
      res.status(oaiResp.status).end(err);
      return;
    }

    const answerSdp = await oaiResp.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Session-Id', sessionId);
    res.status(200).end(JSON.stringify({ answer: answerSdp, instructions: systemPrompt }));
  } catch (err) {
    console.error('[voice]', err);
    res.status(500).end('Server error');
  }
}
