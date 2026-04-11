// POST /api/session — OpenAI / Azure Realtime voice (Knuut AI). Requires auth.
import { getSystemPrompt, langToIso } from './knuut-prompt.js';
import { query } from './db.js';
import { exchangeRealtimeWebRtc, isVoiceProviderConfigured } from '../src/lib/realtime-voice.js';
import { assertVoiceSessionAllowed, getDailyCapSeconds } from '../src/lib/voice-daily-quota.js';

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
    if (!isVoiceProviderConfigured()) {
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
    const topic = (body && body.topic) ? String(body.topic).slice(0, 500) : null;
    const reviewWords = Array.isArray(body && body.review_words) ? body.review_words : [];
    const focusTopics = Array.isArray(body && body.focusTopics) ? body.focusTopics : [];
    const writingSample = (body && body.writing_sample) ? String(body.writing_sample).slice(0, 2000) : null;
    const ophModule = body && body.oph_module ? String(body.oph_module).slice(0, 8) : null;
    const workplacePrep = body && body.workplace_prep ? String(body.workplace_prep).slice(0, 40) : null;

    let learnerId = null;
    if (req.user.role === 'learner') {
      learnerId = req.user.id;
    } else if (req.user.role === 'teacher' && body && body.learner_id) {
      learnerId = body.learner_id;
    }

    let learnerCefr = null;
    let nativeLanguage = null;
    let motherTongueName = null;
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
          motherTongueName = row.mother_tongue || null;
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

    let voiceQuotaSnapshot = {
      applies: false,
      remainingSeconds: getDailyCapSeconds(),
      secondsUsed: 0,
      usageDate: null,
    };
    if (learnerId) {
      try {
        voiceQuotaSnapshot = await assertVoiceSessionAllowed(learnerId);
      } catch (quotaErr) {
        if (quotaErr.code === 'VOICE_DAILY_QUOTA_EXCEEDED') {
          res.status(403).json({
            error: quotaErr.message || 'Daily voice limit reached',
            code: quotaErr.code,
            quota: quotaErr.quota || null,
          });
          return;
        }
        console.error('[voice-quota]', quotaErr.message);
        res.status(500).json({ error: 'Something went wrong' });
        return;
      }
    }

    const systemPrompt = getSystemPrompt({
      mode,
      dashboardMode,
      topic,
      reviewWords,
      focusTopics,
      writingSample,
      learnerCefr,
      nativeLanguage,
      learnerName,
      lastEpisode,
      brainNodes,
      isFirstSession,
      ophModule,
      workplacePrep,
      motherTongueName,
    });

    let realtimeResult;
    try {
      realtimeResult = await exchangeRealtimeWebRtc({ sdpOffer: offerSdp, systemPrompt });
    } catch (voiceErr) {
      console.error('[voice]', voiceErr.message || voiceErr);
      const code = voiceErr.statusCode && voiceErr.statusCode >= 400 && voiceErr.statusCode < 600 ? voiceErr.statusCode : 500;
      res.status(code).json({ error: 'Something went wrong' });
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    if (realtimeResult.sessionId) res.setHeader('X-Session-Id', realtimeResult.sessionId);
    res.status(200).end(JSON.stringify({
      answer: realtimeResult.answerSdp,
      instructions: realtimeResult.instructions,
      dataChannelLabel: realtimeResult.dataChannelLabel,
      remaining_seconds: voiceQuotaSnapshot.applies
        ? voiceQuotaSnapshot.remainingSeconds
        : getDailyCapSeconds(),
      seconds_used_today: voiceQuotaSnapshot.applies ? voiceQuotaSnapshot.secondsUsed : 0,
      voice_quota_date: voiceQuotaSnapshot.usageDate || undefined,
    }));
  } catch (err) {
    console.error('[voice]', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
