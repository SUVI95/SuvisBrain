/**
 * Knuut voice: WebRTC SDP exchange with Azure OpenAI first (when AZURE_OPENAI_* is complete), else OpenAI public API.
 * Azure GA: POST {endpoint}/openai/v1/realtime/client_secrets (api-key) → ephemeral token → POST {endpoint}/openai/v1/realtime/calls (Bearer).
 * Endpoint must be the resource base only (e.g. https://resource.openai.azure.com) — no /openai/deployments/... path.
 * @see https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc?view=foundry-classic
 */

const DATA_CHANNEL_AZURE = 'realtime-channel';
const DATA_CHANNEL_OPENAI = 'oai-events';

/** Tunable via env for noisy rooms (TV, laptop mic, embedded widget). */
function realtimeVadConfig() {
  const threshold = parseFloat(trimEnv('REALTIME_VAD_THRESHOLD'));
  const silenceMs = parseInt(trimEnv('REALTIME_VAD_SILENCE_MS'), 10);
  const prefixMs = parseInt(trimEnv('REALTIME_VAD_PREFIX_MS'), 10);
  return {
    type: 'server_vad',
    threshold: Number.isFinite(threshold) ? Math.min(0.95, Math.max(0.35, threshold)) : 0.65,
    prefix_padding_ms: Number.isFinite(prefixMs) ? prefixMs : 280,
    silence_duration_ms: Number.isFinite(silenceMs) ? silenceMs : 650,
    create_response: true,
  };
}

/** far_field suits laptop / room mics; near_field for headsets. off = omit noise reduction. */
function realtimeInputNoiseReduction() {
  const v = String(trimEnv('REALTIME_INPUT_NOISE_REDUCTION') || 'far_field').toLowerCase();
  if (v === 'off' || v === 'none' || v === 'false' || v === '0') return null;
  if (v === 'near_field') return { type: 'near_field' };
  return { type: 'far_field' };
}

/**
 * @param {'azure' | 'openai'} provider Azure uses explicit pcm16; OpenAI WebRTC often works without input.format (defaults).
 */
function realtimeAudioInputBase(provider) {
  const nr = realtimeInputNoiseReduction();
  const input = {
    turn_detection: realtimeVadConfig(),
  };
  if (provider === 'azure') {
    input.format = { type: 'pcm16', rate: 24000 };
  }
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
  return m || 'gpt-realtime-1.5';
}

function normalizeAzureEndpoint(raw) {
  if (!raw) return '';
  let u = String(raw).trim().replace(/\/$/, '');
  if (!u.startsWith('http')) u = `https://${u}`;
  return u;
}

function trimEnv(name) {
  const v = process.env[name];
  if (v == null || typeof v !== 'string') return '';
  return v.trim();
}

/**
 * True only when Azure realtime is fully configured: endpoint, key, and non-empty deployment name.
 * If AZURE_OPENAI_REALTIME_DEPLOYMENT is unset or blank, voice uses OPENAI_API_KEY (OpenAI API) instead.
 */
export function isAzureVoiceConfigured() {
  const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
  const key = trimEnv('AZURE_OPENAI_API_KEY');
  const deployment = trimEnv('AZURE_OPENAI_REALTIME_DEPLOYMENT');
  return !!(endpoint && key && deployment);
}

/** Voice WebRTC can run if Azure realtime is complete OR OpenAI API key is set. */
export function isVoiceProviderConfigured() {
  return isAzureVoiceConfigured() || !!trimEnv('OPENAI_API_KEY');
}

/** Hints for the browser (data channel label must match the provider before createOffer).
 *  When OPENAI_API_KEY is set, always use OpenAI — server uses the same rule so SDP matches. */
export function getWebRtcClientHints() {
  const azureReady = isAzureVoiceConfigured();
  const hasFallback = !!trimEnv('OPENAI_API_KEY');
  const useAzure = azureReady && !hasFallback;
  return {
    dataChannelLabel: useAzure ? DATA_CHANNEL_AZURE : DATA_CHANNEL_OPENAI,
    provider: useAzure ? 'azure' : 'openai',
  };
}

/**
 * @param {object} p
 * @param {string} p.sdpOffer - WebRTC offer SDP
 * @param {string} p.systemPrompt - Knuut instructions
 * @returns {Promise<{ answerSdp: string, instructions: string, dataChannelLabel: string, sessionId: string | null, voiceProvider: 'azure'|'openai' }>}
 */
export async function exchangeRealtimeWebRtc({ sdpOffer, systemPrompt }) {
  const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
  const azureKey = trimEnv('AZURE_OPENAI_API_KEY');
  const deployment = trimEnv('AZURE_OPENAI_REALTIME_DEPLOYMENT');

  const hasFallbackKey = !!trimEnv('OPENAI_API_KEY');
  // Must match getWebRtcClientHints(): when OPENAI_API_KEY exists, the browser always
  // uses oai-events + OpenAI-style offer. If we answer with Azure here, SDP/data-channel
  // mismatch breaks mic + remote audio with no obvious error.
  if (endpoint && azureKey && deployment && !hasFallbackKey) {
    try {
      const secretUrl = `${endpoint}/openai/v1/realtime/client_secrets`;
      const azureInput = realtimeAudioInputBase('azure');
      const sessionPayload = {
        session: {
          type: 'realtime',
          model: deployment,
          instructions: systemPrompt,
          temperature: realtimeSessionTemperature(),
          audio: {
            input: azureInput,
            output: { voice: 'verse', speed: 1.0 },
          },
        },
      };

      const secretRes = await fetch(secretUrl, {
        method: 'POST',
        headers: {
          'api-key': azureKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionPayload),
        signal: AbortSignal.timeout(3000),
      });

      if (!secretRes.ok) {
        const errText = await secretRes.text();
        throw new Error(`Azure client_secrets failed: ${secretRes.status} ${errText.slice(0, 400)}`);
      }

      const secretJson = await secretRes.json();
      const ephemeral = secretJson.value;
      if (!ephemeral || typeof ephemeral !== 'string') {
        throw new Error('Azure client_secrets: missing ephemeral token (value)');
      }

      const filterRaw = String(trimEnv('AZURE_OPENAI_WEBRTC_FILTER') || 'on').toLowerCase();
      const filterOff = filterRaw === 'off' || filterRaw === '0' || filterRaw === 'false' || filterRaw === 'no';
      const callsUrl = filterOff
        ? `${endpoint}/openai/v1/realtime/calls`
        : `${endpoint}/openai/v1/realtime/calls?webrtcfilter=on`;

      const sdpRes = await fetch(callsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeral}`,
          'Content-Type': 'application/sdp',
        },
        body: sdpOffer,
      });

      if (!sdpRes.ok) {
        const errText = await sdpRes.text();
        throw new Error(`Azure realtime calls failed: ${sdpRes.status} ${errText.slice(0, 400)}`);
      }

      const answerSdp = await sdpRes.text();
      const sessionId =
        (secretJson.session && secretJson.session.id) ||
        secretJson.id ||
        null;

      return {
        answerSdp,
        instructions: systemPrompt,
        dataChannelLabel: DATA_CHANNEL_AZURE,
        sessionId,
        voiceProvider: 'azure',
      };
    } catch (azureErr) {
      throw azureErr;
    }
  }

  const openaiKey = trimEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    const err = new Error(
      'Voice not configured: set OPENAI_API_KEY, or set all of AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_REALTIME_DEPLOYMENT'
    );
    err.statusCode = 500;
    throw err;
  }

  const oaiInput = realtimeAudioInputBase('openai');
  // Step 1: Create client_secret with session config (voice + instructions baked in)
  const secretResp = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: openaiRealtimeModel(),
        instructions: systemPrompt,
        temperature: realtimeSessionTemperature(),
        audio: {
          output: { voice: 'verse', speed: 1.0 },
          input: oaiInput,
        },
      },
    }),
  });

  if (!secretResp.ok) {
    const errText = await secretResp.text();
    const err = new Error(`OpenAI client_secrets failed: ${secretResp.status} ${errText.slice(0, 200)}`);
    err.statusCode = secretResp.status;
    throw err;
  }

  const secretData = await secretResp.json();
  const ephemeralKey = secretData.value;
  console.log(
    '[voice] OpenAI client_secret — model:',
    openaiRealtimeModel(),
    '| voice: verse | instructions:',
    systemPrompt.length,
    'chars'
  );

  // Step 2: SDP exchange using ephemeral key
  const oaiResp = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp',
    },
    body: sdpOffer,
  });

  if (!oaiResp.ok) {
    const errText = await oaiResp.text();
    const err = new Error(`OpenAI realtime/calls failed: ${oaiResp.status} ${errText.slice(0, 200)}`);
    err.statusCode = oaiResp.status;
    throw err;
  }

  const answerSdp = await oaiResp.text();
  return {
    answerSdp,
    instructions: systemPrompt,
    dataChannelLabel: DATA_CHANNEL_OPENAI,
    sessionId: secretData.session?.id || null,
    voiceProvider: 'openai',
  };
}

/**
 * Health check for the provider actually used for voice:
 * - Full Azure config → Azure deployments API
 * - Otherwise (incl. missing/empty deployment) → OpenAI /v1/models when OPENAI_API_KEY is set
 * So waiting on Azure quota with only endpoint+key set still reports voice ok if OpenAI fallback works.
 */
export async function checkVoiceProviderReachable() {
  if (isAzureVoiceConfigured()) {
    const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
    const azureKey = trimEnv('AZURE_OPENAI_API_KEY');
    const apiVersion = trimEnv('AZURE_OPENAI_API_VERSION') || '2025-01-01-preview';
    try {
      const u = `${endpoint}/openai/deployments?api-version=${encodeURIComponent(apiVersion)}`;
      const r = await fetch(u, { headers: { 'api-key': azureKey } });
      return r.ok ? 'ok' : `fail:${r.status}`;
    } catch (e) {
      return `fail:${e.message || 'error'}`;
    }
  }
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
