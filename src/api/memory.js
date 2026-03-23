/**
 * Brain graph API helpers for Neon
 * Nodes and edges for the knowledge graph
 */

import { sql } from '../lib/db.js';

export async function getBrainNodes() {
  const rows = await sql`
    select id, label, type, agent_id, metadata, created_at
    from brain_nodes
    order by created_at asc
  `;
  return rows.map((r) => ({
    id: r.label,
    type: r.type,
    dbId: r.id,
    agentId: r.agent_id,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));
}

export async function getBrainEdges() {
  const rows = await sql`
    select e.id, e.source_id, e.target_id, e.value,
           s.label as source_label, t.label as target_label
    from brain_edges e
    join brain_nodes s on e.source_id = s.id
    join brain_nodes t on e.target_id = t.id
  `;
  return rows.map((r) => ({
    source: r.source_label,
    target: r.target_label,
    value: r.value,
    id: r.id,
  }));
}

export async function getBrainGraph() {
  const [nodes, edges] = await Promise.all([
    getBrainNodes(),
    getBrainEdges(),
  ]);
  return { nodes, links: edges };
}

export async function createNode({ label, type, agentId = null, metadata = {} }) {
  const [row] = await sql`
    insert into brain_nodes (label, type, agent_id, metadata)
    values (${label}, ${type}, ${agentId}, ${metadata})
    returning id, label, type, created_at
  `;
  return {
    id: row.label,
    type: row.type,
    dbId: row.id,
    createdAt: row.created_at,
  };
}

export async function createEdge({ sourceId, targetId, value = 1 }) {
  // sourceId/targetId can be UUID (db id) or label
  const [row] = await sql`
    insert into brain_edges (source_id, target_id, value)
    select s.id, t.id, ${value}
    from brain_nodes s, brain_nodes t
    where (s.id::text = ${sourceId} or s.label = ${sourceId})
      and (t.id::text = ${targetId} or t.label = ${targetId})
    returning id, value
  `;
  return row;
}
