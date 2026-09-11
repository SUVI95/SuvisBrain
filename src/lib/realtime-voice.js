/**
 * Knuut voice: WebRTC SDP exchange via OpenAI Realtime API only.
 * @see https://developers.openai.com/api/docs/guides/realtime
 */

const DATA_CHANNEL_OPENAI = 'oai-events';

/**
 * Turn detection: default server_vad with high threshold (fewer breath/false starts).
 * REALTIME_VAD_MODE=semantic uses semantic end-of-utterance (optional).
 */
function realtimeVadConfig() {
  const mode = String(trimEnv('REALTIME_VAD_MODE') || 'server').toLowerCase().replace(/-/g, '_');
  if (mode === 'semantic' || mode === 'semantic_vad') {
    const e = String(trimEnv('REALTIME_VAD_EAGERNESS') || 'low').toLowerCase();
    const eagerness = ['low', 'medium', 'high', 'auto'].includes(e) ? e : 'low';
    return {
      type: 'semantic_vad',
      eagerness,
      create_response: true,
      interrupt_response: false,
    };
  }
  const threshold = parseFloat(trimEnv('REALTIME_VAD_THRESHOLD'));
  const silenceMs = parseInt(trimEnv('REALTIME_VAD_SILENCE_MS'), 10);
  const prefixMs = parseInt(trimEnv('REALTIME_VAD_PREFIX_MS'), 10);
  return {
    type: 'server_vad',
    threshold: Number.isFinite(threshold) ? Math.min(0.95, Math.max(0.35, threshold)) : 0.78,
    prefix_padding_ms: Number.isFinite(prefixMs) ? prefixMs : 240,
    silence_duration_ms: Number.isFinite(silenceMs) ? silenceMs : 850,
    create_response: true,
    interrupt_response: false,
  };
}

/** far_field suits laptop / room mics; near_field for headsets. off = omit noise reduction. */
function realtimeInputNoiseReduction() {
  const v = String(trimEnv('REALTIME_INPUT_NOISE_REDUCTION') || 'far_field').toLowerCase();
  if (v === 'off' || v === 'none' || v === 'false' || v === '0') return null;
  if (v === 'near_field') return { type: 'near_field' };
  return { type: 'far_field' };
}

function realtimeAudioInputBase() {
  const nr = realtimeInputNoiseReduction();
  const input = {
    turn_detection: realtimeVadConfig(),
  };
  if (nr) input.noise_reduction = nr;
  return input;
}

function realtimeSessionTemperature() {
  const t = parseFloat(trimEnv('REALTIME_TEMPERATURE'));
  if (Number.isFinite(t)) return Math.min(1.2, Math.max(0.6, t));
  return 0.75;
}

function openaiRealtimeModel() {
  const m = trimEnv('OPENAI_REALTIME_MODEL');
  return m || 'gpt-realtime-2';
}

/** Default verse — matches Knuut character; override with OPENAI_REALTIME_VOICE. */
function realtimeOutputVoice() {
  const v = trimEnv('OPENAI_REALTIME_VOICE');
  return v || 'verse';
}

function trimEnv(name) {
  const v = process.env[name];
  if (v == null || typeof v !== 'string') return '';
  return v.trim();
}

/** Voice WebRTC requires OpenAI API key. */
export function isVoiceProviderConfigured() {
  return !!trimEnv('OPENAI_API_KEY');
}

/** Browser must create this data channel label before the SDP offer. */
export function getWebRtcClientHints() {
  return {
    dataChannelLabel: DATA_CHANNEL_OPENAI,
    provider: 'openai',
  };
}

export function isCompleteSdpOffer(sdp) {
  const s = String(sdp || '').trim();
  return s.startsWith('v=0') && /m=audio/i.test(s) && s.length >= 200;
}

function realtimeSessionConfig(systemPrompt) {
  return {
    type: 'realtime',
    model: openaiRealtimeModel(),
    instructions: systemPrompt,
    audio: {
      output: { voice: realtimeOutputVoice(), speed: 1.0 },
      input: realtimeAudioInputBase(),
    },
  };
}

/** Multipart body matching OpenAI's GA /v1/realtime/calls backend proxy. */
function buildRealtimeCallsMultipart(sdpOffer, session) {
  const boundary = `----KnuutForm${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const sessionJson = JSON.stringify(session);
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="sdp"\r\n` +
    `Content-Type: application/sdp\r\n\r\n` +
    `${sdpOffer}\r\n` +
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="session"\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${sessionJson}\r\n` +
    `--${boundary}--\r\n`;
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function sessionIdFromCallsResponse(resp, text) {
  const loc = resp.headers.get('location') || resp.headers.get('Location') || '';
  const fromLoc = loc.match(/\/calls\/([^/?#]+)/);
  if (fromLoc) return fromLoc[1];
  const fromBody = String(text || '').match(/sess_[A-Za-z0-9]+/);
  return fromBody ? fromBody[0] : null;
}

/**
 * @param {object} p
 * @param {string} p.sdpOffer - WebRTC offer SDP
 * @param {string} p.systemPrompt - Knuut instructions
 * @returns {Promise<{ answerSdp: string, instructions: string, dataChannelLabel: string, sessionId: string | null, voiceProvider: 'openai' }>}
 */
export async function exchangeRealtimeWebRtc({ sdpOffer, systemPrompt }) {
  const openaiKey = trimEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    const err = new Error('Voice not configured: set OPENAI_API_KEY');
    err.statusCode = 500;
    throw err;
  }

  const offer = String(sdpOffer || '').trim();
  if (!isCompleteSdpOffer(offer)) {
    const err = new Error(
      `Incomplete SDP offer (${offer.length} bytes). Browser must send a full WebRTC offer with m=audio.`
    );
    err.statusCode = 400;
    throw err;
  }

  const session = realtimeSessionConfig(systemPrompt);
  console.log(
    '[voice] realtime/calls multipart — model:',
    session.model,
    '| voice:',
    realtimeOutputVoice(),
    '| sdp:',
    offer.length,
    'bytes | instructions:',
    String(systemPrompt || '').length,
    'chars'
  );

  const mp = buildRealtimeCallsMultipart(offer, session);
  const oaiResp = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      Accept: 'application/sdp',
      'Content-Type': mp.contentType,
    },
    body: mp.body,
  });

  const answerSdp = await oaiResp.text();
  if (!oaiResp.ok) {
    const err = new Error(`OpenAI realtime/calls failed: ${oaiResp.status} ${answerSdp.slice(0, 400)}`);
    err.statusCode = oaiResp.status;
    throw err;
  }
  if (!String(answerSdp).includes('v=0')) {
    const err = new Error(`OpenAI realtime/calls returned a non-SDP body: ${answerSdp.slice(0, 200)}`);
    err.statusCode = 502;
    throw err;
  }

  return {
    answerSdp,
    instructions: systemPrompt,
    dataChannelLabel: DATA_CHANNEL_OPENAI,
    sessionId: sessionIdFromCallsResponse(oaiResp, answerSdp),
    voiceProvider: 'openai',
  };
}

/** Health: OpenAI models endpoint when OPENAI_API_KEY is set. */
export async function checkVoiceProviderReachable() {
  const openaiKey = trimEnv('OPENAI_API_KEY');
  if (openaiKey) {
    try {
      const oaiRes = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      return oaiRes.ok ? 'ok' : `fail:${oaiRes.status}`;
    } catch (e) {
      return `fail:${e.message || 'error'}`;
    }
  }
  return 'skipped';
}

/**
 * Deep smoke check: can OpenAI issue a realtime client secret for the configured model/voice?
 * Does not open a WebRTC call — validates the first hop of the widget voice pipeline.
 */
export async function checkRealtimeClientSecrets() {
  const openaiKey = trimEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    return { ok: false, reason: 'OPENAI_API_KEY not set' };
  }

  const model = openaiRealtimeModel();
  const voice = realtimeOutputVoice();

  try {
    const resp = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          instructions: 'Smoke test — no conversation.',
          audio: {
            output: { voice, speed: 1.0 },
            input: realtimeAudioInputBase(),
          },
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        ok: false,
        reason: `client_secrets ${resp.status}: ${errText.slice(0, 300)}`,
        model,
        voice,
      };
    }

    const data = await resp.json();
    return {
      ok: true,
      model,
      voice,
      session_id: data.session?.id || null,
    };
  } catch (e) {
    return { ok: false, reason: e.message || String(e), model, voice };
  }
}
