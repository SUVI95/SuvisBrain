#!/usr/bin/env node
/**
 * Multi-tenancy migration — add organisations and org_id to learners, agents, episodes, teachers.
 * Run: node scripts/migrate-organisations.js
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS organisations (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    type text default 'school',
    plan text default 'trial',
    created_at timestamptz default now()
  )`,
  `ALTER TABLE learners ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id)`,
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id)`,
  `ALTER TABLE episodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id)`,
  `ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id)`,
  `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id)`,
  `ALTER TABLE teachers ADD COLUMN IF NOT EXISTS admin boolean default false`,
  `CREATE INDEX IF NOT EXISTS idx_learners_org ON learners(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_episodes_org ON episodes(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_brain_nodes_org ON brain_nodes(org_id)`,
  `INSERT INTO organisations (name, type, plan) VALUES
    ('HSBRIDGE AI', 'company', 'pro'),
    ('Kajaani City Schools', 'municipality', 'trial')
   ON CONFLICT (name) DO NOTHING`,
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  for (const sql of STATEMENTS) {
    try {
      await query(sql);
      console.log('OK:', sql.slice(0, 60).replace(/\n/g, ' ') + '...');
    } catch (err) {
      console.error('FAIL:', err.message);
      throw err;
    }
  }
  console.log('Migration complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
