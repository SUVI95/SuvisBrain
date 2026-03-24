#!/usr/bin/env node
/**
 * Clean duplicate brain_nodes in Neon.
 * Keeps the oldest (lowest created_at) per label; reassigns edges; removes orphans.
 *
 * Usage: node scripts/clean-duplicates.js [--dry-run]
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes will be made\n');
  }

  let nodesDeleted = 0;
  let edgesReassigned = 0;
  let selfLoopsRemoved = 0;
  let duplicateEdgesRemoved = 0;
  let orphanedEdgesRemoved = 0;
  let sessionOrphanCount = 0;

  // 1. Find duplicate labels
  const dupLabels = await query(
    `SELECT label, COUNT(*)::int as count FROM brain_nodes GROUP BY label HAVING COUNT(*) > 1`
  );
  const duplicateLabels = dupLabels.rows || [];
  console.log(`Found ${duplicateLabels.length} labels with duplicates\n`);

  if (duplicateLabels.length === 0) {
    console.log('No duplicate labels.');
  }

  for (const { label } of duplicateLabels) {
    const nodes = await query(
      `SELECT id, created_at FROM brain_nodes WHERE label = $1 ORDER BY created_at ASC`,
      [label]
    );
    const rows = nodes.rows || [];
    const keepId = rows[0].id;
    const toDelete = rows.slice(1);

    console.log(`Label "${label}": keeping ${keepId}, deleting ${toDelete.length} duplicate(s)`);

    for (const dupe of toDelete) {
      const dupeId = dupe.id;

      // Count edges that reference this duplicate (source or target)
      const edgeCount = await query(
        `SELECT COUNT(*)::int as c FROM brain_edges WHERE source_id = $1 OR target_id = $1`,
        [dupeId]
      );
      edgesReassigned += (edgeCount.rows?.[0]?.c) ?? 0;

      if (!DRY_RUN) {
        await query(`UPDATE brain_edges SET source_id = $1 WHERE source_id = $2`, [keepId, dupeId]);
        await query(`UPDATE brain_edges SET target_id = $1 WHERE target_id = $2`, [keepId, dupeId]);
        await query(`DELETE FROM brain_nodes WHERE id = $1`, [dupeId]);
      }
      nodesDeleted++;
    }
  }

  // 2. Delete self-loops (source_id = target_id)
  const selfLoopCount = await query(
    `SELECT COUNT(*)::int as c FROM brain_edges WHERE source_id = target_id`
  );
  selfLoopsRemoved = (selfLoopCount.rows?.[0]?.c) ?? 0;
  if (!DRY_RUN && selfLoopsRemoved > 0) {
    await query(`DELETE FROM brain_edges WHERE source_id = target_id`);
  }

  // 3. Delete duplicate (source_id, target_id) pairs — keep one per pair
  const dupRes = await query(`
    SELECT COUNT(*)::int as c FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY source_id, target_id ORDER BY id) as rn
      FROM brain_edges
    ) sub WHERE rn > 1
  `);
  duplicateEdgesRemoved = (dupRes.rows?.[0]?.c) ?? 0;
  if (!DRY_RUN && duplicateEdgesRemoved > 0) {
    await query(`
      DELETE FROM brain_edges WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY source_id, target_id ORDER BY id) as rn
          FROM brain_edges
        ) sub WHERE rn > 1
      )
    `);
  }

  // 4. Delete orphaned "Session" nodes (no incoming or outgoing edges)
  const sessionOrphans = await query(`
    SELECT id FROM brain_nodes
    WHERE label = 'Session'
      AND id NOT IN (SELECT source_id FROM brain_edges UNION SELECT target_id FROM brain_edges)
  `);
  sessionOrphanCount = (sessionOrphans.rows || []).length;
  if (!DRY_RUN && sessionOrphanCount > 0) {
    await query(`
      DELETE FROM brain_nodes
      WHERE label = 'Session'
        AND id NOT IN (SELECT source_id FROM brain_edges UNION SELECT target_id FROM brain_edges)
    `);
  }
  if (sessionOrphanCount > 0) {
    console.log(`Orphaned "Session" nodes removed: ${sessionOrphanCount}`);
  }

  // 5. Delete orphaned edges
  const orphanCount = await query(`
    SELECT COUNT(*)::int as c FROM brain_edges
    WHERE source_id NOT IN (SELECT id FROM brain_nodes)
       OR target_id NOT IN (SELECT id FROM brain_nodes)
  `);
  orphanedEdgesRemoved = (orphanCount.rows?.[0]?.c) ?? 0;

  if (!DRY_RUN && orphanedEdgesRemoved > 0) {
    await query(`
      DELETE FROM brain_edges
      WHERE source_id NOT IN (SELECT id FROM brain_nodes)
         OR target_id NOT IN (SELECT id FROM brain_nodes)
    `);
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Duplicate labels found:   ${duplicateLabels.length}`);
  console.log(`Nodes deleted:            ${nodesDeleted}`);
  console.log(`Orphan Session nodes:     ${sessionOrphanCount}`);
  console.log(`Edges reassigned:         ${edgesReassigned}`);
  console.log(`Self-loops removed:        ${selfLoopsRemoved}`);
  console.log(`Duplicate edges removed:  ${duplicateEdgesRemoved}`);
  console.log(`Orphaned edges removed:   ${orphanedEdgesRemoved}`);
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
