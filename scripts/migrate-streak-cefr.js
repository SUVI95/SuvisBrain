#!/usr/bin/env node
/**
 * Add streak freezes + CEFR history. Run: node scripts/migrate-streak-cefr.js
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const STMTS = [
  `ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_remaining int DEFAULT 2`,
  `ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_used jsonb DEFAULT '[]'`,  -- array of date strings
  `CREATE TABLE IF NOT EXISTS cefr_history (
    id uuid primary key default gen_random_uuid(),
    learner_id uuid REFERENCES learners(id),
    from_level text,
    to_level text NOT NULL,
    reason text,
    created_at timestamptz default now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cefr_history_learner ON cefr_history(learner_id)`,
];

async function main() {
  for (const sql of STMTS) {
    await query(sql);
    console.log('OK:', sql.slice(0, 60) + '...');
  }
  console.log('Migration complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
