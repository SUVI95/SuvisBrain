#!/usr/bin/env node
/**
 * Clean auto-generated junk nodes from the brain graph.
 * Targets: timestamp IDs (8+ digits), "177..." patterns, generic conversation noise.
 *
 * Usage: node scripts/clean-junk-nodes.js [--dry-run]
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const DRY_RUN = process.argv.includes('--dry-run');

// Junk patterns: 8+ digits anywhere, or "177" followed by digits
const JUNK_SQL = `
  SELECT id, label, type FROM brain_nodes
  WHERE label ~ '[0-9]{8,}'
     OR label ~ '177[0-9]+'
`;

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes will be made\n');
  }

  const junkResult = await query(JUNK_SQL);
  const junkNodes = junkResult.rows || [];
  const totalFound = junkNodes.length;

  console.log(`Found ${totalFound} junk node(s)\n`);

  let nodesDeleted = 0;
  let edgesRemoved = 0;

  for (const node of junkNodes) {
    const edgeCount = await query(
      `SELECT COUNT(*)::int as c FROM brain_edges WHERE source_id = $1 OR target_id = $1`,
      [node.id]
    );
    const numEdges = (edgeCount.rows?.[0]?.c) ?? 0;
    edgesRemoved += numEdges;

    console.log(`  "${node.label}" (${node.type})${DRY_RUN ? ' [would delete]' : ''}`);

    if (!DRY_RUN) {
      await query(`DELETE FROM brain_edges WHERE source_id = $1 OR target_id = $1`, [node.id]);
      await query(`DELETE FROM brain_nodes WHERE id = $1`, [node.id]);
    }
    nodesDeleted++;
  }

  console.log('\n--- Summary ---');
  console.log(`Total junk nodes found:   ${totalFound}`);
  console.log(`Total junk nodes deleted: ${nodesDeleted}`);
  console.log(`Total edges removed:       ${edgesRemoved}`);
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }

  console.log('\n--- Healthy nodes (remaining) ---');
  const healthy = await query(`
    SELECT type, COUNT(*)::int as count
    FROM brain_nodes
    GROUP BY type
    ORDER BY count DESC
  `);
  const rows = healthy.rows || [];
  if (rows.length === 0) {
    console.log('  (no nodes)');
  } else {
    for (const r of rows) {
      console.log(`  ${r.type}: ${r.count}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
