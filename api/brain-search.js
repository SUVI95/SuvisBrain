// GET /api/brain/search?q=text — semantic search over brain nodes
import { query } from './db.js';
import { getEmbedding } from '../src/lib/embeddings.js';

export default async function brainSearchHandler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GET only' }));
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const q = url.searchParams.get('q') || '';
  if (!q.trim()) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ nodes: [] }));
    return;
  }

  try {
    const embedding = await getEmbedding(q);
    if (!embedding || !Array.isArray(embedding)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ nodes: [] }));
      return;
    }

    const result = await query(
      `SELECT id, label, type, metadata,
        1 - (embedding <=> $1::vector) as similarity
       FROM brain_nodes
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(embedding)]
    );

    const nodes = (result.rows || []).map((r) => ({
      id: r.id,
      label: r.label,
      type: r.type,
      metadata: r.metadata,
      similarity: r.similarity != null ? parseFloat(r.similarity) : 0,
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ nodes }));
  } catch (err) {
    console.error('GET /api/brain/search error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}
