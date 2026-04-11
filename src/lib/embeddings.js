/**
 * Embeddings: Azure OpenAI deployment first (EU), then OpenAI API fallback.
 * Azure: POST {endpoint}/openai/deployments/{AZURE_OPENAI_EMBEDDING_DEPLOYMENT}/embeddings?api-version=...
 */

function trimEnv(name) {
  const v = process.env[name];
  if (v == null || typeof v !== 'string') return '';
  return v.trim();
}

function normalizeAzureEndpoint(raw) {
  if (!raw) return '';
  let u = String(raw).trim().replace(/\/$/, '');
  if (!u.startsWith('http')) u = `https://${u}`;
  return u;
}

function isAzureEmbeddingsConfigured() {
  const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
  const key = trimEnv('AZURE_OPENAI_API_KEY');
  const deployment = trimEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
  return !!(endpoint && key && deployment);
}

export async function getEmbedding(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return null;
  const input = text.trim().slice(0, 8000);

  if (isAzureEmbeddingsConfigured()) {
    const endpoint = normalizeAzureEndpoint(trimEnv('AZURE_OPENAI_ENDPOINT'));
    const key = trimEnv('AZURE_OPENAI_API_KEY');
    const deployment = trimEnv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT');
    const apiVersion = trimEnv('AZURE_OPENAI_API_VERSION') || '2025-01-01-preview';
    const url = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/embeddings?api-version=${encodeURIComponent(apiVersion)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error?.message || JSON.stringify(data).slice(0, 300);
        console.error('getEmbedding Azure error:', res.status, msg);
        return null;
      }
      return data.data?.[0]?.embedding || null;
    } catch (err) {
      console.error('getEmbedding Azure error:', err.message);
      return null;
    }
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input,
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('getEmbedding error:', err.message);
    return null;
  }
}
