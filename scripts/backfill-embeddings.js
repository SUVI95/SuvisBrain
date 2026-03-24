#!/usr/bin/env node
/**
 * Backfill embeddings for brain_nodes that have NULL embedding.
 * Run: node scripts/backfill-embeddings.js
 */
import 'dotenv/config';
import { query } from '../api/db.js';
import { getEmbedding } from '../src/lib/embeddings.js';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set');
    process.exit(1);
  }

  const result = await query(
    `SELECT id, label FROM brain_nodes WHERE embedding IS NULL AND label IS NOT NULL AND LENGTH(TRIM(label)) > 2`
  );
  const rows = result.rows || [];
  console.log(`Found ${rows.length} nodes without embeddings`);

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const emb = await getEmbedding(row.label);
    if (emb && Array.isArray(emb)) {
      try {
        await query('UPDATE brain_nodes SET embedding = $1::vector WHERE id = $2', [
          JSON.stringify(emb),
          row.id,
        ]);
        ok++;
        console.log(`OK: ${row.label.slice(0, 40)}...`);
      } catch (e) {
        fail++;
        console.error(`FAIL: ${row.label}`, e.message);
      }
    } else {
      fail++;
      console.log(`SKIP (no embedding): ${row.label}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nDone. OK: ${ok}, Failed: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
