// api/agent-prompt.js — POST /api/agents/:id/prompt
// Prompts an agent via OpenRouter, saves episode + brain node, returns reply.
import { query } from './db.js';
import { getPersona } from './agent-personas.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export default async function agentPromptHandler(req, res, agentId) {
  if (req.method !== 'POST') {
    res.writeHead(405).end();
    return;
  }

  const body = req.body || {};
  let message = typeof body.message === 'string' ? body.message.trim() : '';
  const context = typeof body.context === 'string' ? body.context.trim() : '';

  if (!message) {
    return sendJson(res, 400, { error: 'Missing message' });
  }

  if (context) {
    message = `${message}\n\nContext:\n${context}`;
  }

  try {
    const agentResult = await query(
      'SELECT id, name, role FROM agents WHERE id = $1',
      [agentId]
    );
    if (!agentResult.rows || agentResult.rows.length === 0) {
      return sendJson(res, 404, { error: 'Agent not found' });
    }
    const agent = agentResult.rows[0];

    const systemPrompt = getPersona(agent);
    const key = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_2;
    if (!key) {
      return sendJson(res, 500, { error: 'OPENROUTER_API_KEY not set' });
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://suvisbrain.vercel.app',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    const data = await response.json();
    const reply =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
      '';

    const title = message.slice(0, 60);
    const summary = reply.slice(0, 200);
    const rawTranscript = JSON.stringify({ message: body.message, reply });

    const episodeResult = await query(
      `INSERT INTO episodes (agent_id, title, summary, raw_transcript, language, lead_qualified)
       VALUES ($1, $2, $3, $4, 'en', $5)
       RETURNING id`,
      [
        agent.id,
        title,
        summary,
        rawTranscript,
        agent.name === 'Nova' && /QUALIFIED|qualified lead|lead is qualified/i.test(reply),
      ]
    );
    const episodeId = episodeResult.rows[0].id;

    const nodeLabel = message.slice(0, 50);
    const existingNode = await query(
      'SELECT id FROM brain_nodes WHERE LOWER(label) = LOWER($1)',
      [nodeLabel]
    );
    let nodeId;
    let inserted = false;
    if (existingNode.rows.length > 0) {
      nodeId = existingNode.rows[0].id;
    } else {
      const nodeResult = await query(
        `INSERT INTO brain_nodes (label, type, agent_id, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          nodeLabel,
          'Conversation',
          agent.id,
          JSON.stringify({ confidence_score: 0.6, source: 'agent-prompt' }),
        ]
      );
      nodeId = nodeResult.rows[0].id;
      inserted = true;
    }

    if (inserted) {
      const coreResult = await query(
        'SELECT id FROM brain_nodes WHERE type = \'Core\' LIMIT 1'
      );
      if (coreResult.rows.length > 0) {
        await query(
          `INSERT INTO brain_edges (source_id, target_id, value) VALUES ($1, $2, 1)`,
          [coreResult.rows[0].id, nodeId]
        );
      }
    }

    sendJson(res, 200, { reply, episode_id: episodeId, node_id: nodeId });
  } catch (err) {
    console.error('agent-prompt error:', err);
    sendJson(res, 500, { error: err.message });
  }
}
