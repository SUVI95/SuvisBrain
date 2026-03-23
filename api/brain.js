/**
 * Vercel Serverless API: Brain graph
 * GET  /api/brain  → { nodes, links }
 * POST /api/brain  → create node (body: { label, type, agentId?, metadata? })
 */

import { getBrainGraph, createNode } from '../src/api/memory.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'DATABASE_URL not configured. Add it in .env or Vercel env vars.',
    });
  }

  try {
    if (req.method === 'GET') {
      const graph = await getBrainGraph();
      return res.status(200).json(graph);
    }

    if (req.method === 'POST') {
      const { label, type, agentId, metadata } = req.body || {};
      if (!label || !type) {
        return res.status(400).json({
          error: 'Missing required fields: label, type',
        });
      }
      const validTypes = ['Core', 'Memory', 'Conversation', 'Entity', 'Skill', 'Agent'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `type must be one of: ${validTypes.join(', ')}`,
        });
      }
      const node = await createNode({
        label,
        type,
        agentId: agentId || null,
        metadata: metadata || {},
      });
      return res.status(201).json(node);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/brain]', err);
    return res.status(500).json({
      error: err.message || 'Database error',
    });
  }
}
