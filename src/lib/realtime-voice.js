/**
 * Knuut voice: WebRTC SDP exchange with Azure OpenAI first (when AZURE_OPENAI_* is complete), else OpenAI public API.
 * Azure GA: POST {endpoint}/openai/v1/realtime/client_secrets (api-key) → ephemeral token → POST {endpoint}/openai/v1/realtime/calls (Bearer).
 * Endpoint must be the resource base only (e.g. https://resource.openai.azure.com) — no /openai/deployments/... path.
 * @see https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/realtime-audio-webrtc?view=foundry-classic
 */

const DATA_CHANNEL_AZURE = 'realtime-channel';
const DATA_CHANNEL_OPENAI = 'oai-events';

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

/** Hints for the browser (data channel label must match the provider before createOffer). */
export function getWebRtcClientHints() {
  return {
    dataChannelLabel: isAzureVoiceConfigured() ? DATA_CHANNEL_AZURE : DATA_CHANNEL_OPENAI,
    provider: isAzureVoiceConfigured() ? 'azure' : 'openai',
  };
}

/**
 * @param {object} p
 * @param {string} p.sdpOffer - WebRTC offer SDP
 * @param {string} p.systemPrompt - Knuut instructions
 * @returns {Promise<{ answerSdp: string, instructions: string, dataChannelLabel: string, sessionId: string | null }>}
 */
export async function exchangeRealtimeWebRtc({ sdpOffer, systemPrompt }) {
  const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
  const azureKey = trimEnv('AZURE_OPENAI_API_KEY');
  const deployment = trimEnv('AZURE_OPENAI_REALTIME_DEPLOYMENT');

  if (endpoint && azureKey && deployment) {
    const secretUrl = `${endpoint}/openai/v1/realtime/client_secrets`;
    const minimalAudio = trimEnv('AZURE_OPENAI_REALTIME_MINIMAL_AUDIO') === '1';
    const sessionPayload = {
      session: {
        type: 'realtime',
        model: deployment,
        instructions: systemPrompt,
        audio: minimalAudio
          ? { output: { voice: 'verse' } }
          : {
              input: {
                format: { type: 'pcm16', rate: 24000 },
                turn_detection: {
                  type: 'server_vad',
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                  create_response: true,
                },
              },
              output: { voice: 'verse' },
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
    });

    if (!secretRes.ok) {
      const errText = await secretRes.text();
      const err = new Error(`Azure client_secrets failed: ${secretRes.status} ${errText.slice(0, 400)}`);
      err.statusCode = secretRes.status;
      throw err;
    }

    const secretJson = await secretRes.json();
    const ephemeral = secretJson.value;
    if (!ephemeral || typeof ephemeral !== 'string') {
      const err = new Error('Azure client_secrets: missing ephemeral token (value)');
      err.statusCode = 502;
      throw err;
    }

    let callsUrl = `${endpoint}/openai/v1/realtime/calls`;
    // GA WebRTC audio path: Microsoft samples use webrtcfilter=on; disable with AZURE_OPENAI_WEBRTC_FILTER=0
    const filterRaw = trimEnv('AZURE_OPENAI_WEBRTC_FILTER');
    const filterOff = /^(0|false|off|no)$/i.test(filterRaw);
    if (!filterOff) {
      callsUrl += `${callsUrl.includes('?') ? '&' : '?'}webrtcfilter=on`;
    }

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
      const err = new Error(`Azure realtime calls failed: ${sdpRes.status} ${errText.slice(0, 400)}`);
      err.statusCode = sdpRes.status;
      throw err;
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
    };
  }

  const openaiKey = trimEnv('OPENAI_API_KEY');
  if (!openaiKey) {
    const err = new Error(
      'Voice not configured: set OPENAI_API_KEY, or set all of AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_REALTIME_DEPLOYMENT'
    );
    err.statusCode = 500;
    throw err;
  }

  const createResp = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-realtime-1.5',
      voice: 'verse',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      instructions: systemPrompt,
      turn_detection: { type: 'server_vad' },
    }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    const err = new Error(`OpenAI realtime sessions failed: ${createResp.status} ${errText.slice(0, 200)}`);
    err.statusCode = createResp.status;
    throw err;
  }

  const created = await createResp.json();
  const sessionId = created.id;
  const apiUrl = `https://api.openai.com/v1/realtime?model=gpt-realtime-1.5&session=${encodeURIComponent(sessionId)}`;
  const oaiResp = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/sdp',
      'OpenAI-Beta': 'realtime=v1',
    },
    body: sdpOffer,
  });

  if (!oaiResp.ok) {
    const errText = await oaiResp.text();
    const err = new Error(`OpenAI SDP exchange failed: ${oaiResp.status} ${errText.slice(0, 200)}`);
    err.statusCode = oaiResp.status;
    throw err;
  }

  const answerSdp = await oaiResp.text();
  return {
    answerSdp,
    instructions: systemPrompt,
    dataChannelLabel: DATA_CHANNEL_OPENAI,
    sessionId,
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
