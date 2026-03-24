/**
 * OpenAI text-embedding-3-small — 1536 dimensions
 */
export async function getEmbedding(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !text || typeof text !== 'string' || !text.trim()) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.trim().slice(0, 8000),
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('getEmbedding error:', err.message);
    return null;
  }
}
