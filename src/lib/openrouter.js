/**
 * OpenRouter API client for non-realtime tasks
 * Use these keys for: summarization, text analysis, embeddings, etc.
 * Keeps OpenAI API for voice-to-voice only.
 */

const keys = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2,
].filter(Boolean);

let keyIndex = 0;

export function getOpenRouterKey() {
  if (keys.length === 0) return null;
  const key = keys[keyIndex];
  keyIndex = (keyIndex + 1) % keys.length;
  return key;
}

export function hasOpenRouterKeys() {
  return keys.length > 0;
}

/**
 * Call OpenRouter Chat API
 * @param {object} opts - { model?, messages?, ... }
 * @returns {Promise<object>} - API response
 */
export async function openRouterChat(opts = {}) {
  const key = getOpenRouterKey();
  if (!key) {
    throw new Error('OPENROUTER_API_KEY not set');
  }
  const model = opts.model || 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': opts.referer || 'https://suvisbrain.local',
    },
    body: JSON.stringify({
      model,
      messages: opts.messages || [],
      ...opts,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }
  return res.json();
}
