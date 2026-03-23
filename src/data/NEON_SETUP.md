# Neon Database Setup

**Yes — you must run the SQL in Neon.** The schema and migrations are not applied automatically.

## 1. Verify what exists (run in Neon SQL Editor)

Paste this in [Neon Console](https://console.neon.tech) → your project → **SQL Editor**:

**⚠️ Copy only the SQL below — do NOT include the \`\`\`sql or \`\`\` markers.**

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check learners table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'learners' ORDER BY ordinal_position;

-- Check episodes table (need learner_id, metadata)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'episodes' ORDER BY ordinal_position;

-- Check brain_nodes table (need metadata, optionally confidence_history)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'brain_nodes' ORDER BY ordinal_position;
```

## 2. Required tables and columns

| Table        | Required columns                                        |
|-------------|----------------------------------------------------------|
| `learners`  | id, name, email, mother_tongue, cefr_level               |
| `episodes`  | id, learner_id, title, summary, metadata, created_at     |
| `brain_nodes` | id, label, type, metadata, created_at, updated_at     |
| `agents`    | id, name (for brain edges)                               |

## 3. Apply migrations (if anything is missing)

Run `schema.sql` first (creates tables), then the migrations below in order:

**File:** `src/data/schema.sql` — full schema (agents, brain_nodes, brain_edges, episodes, learners, entities)

**Then run:** `src/data/001-confidence-history.sql` (episodes.metadata, brain_nodes.confidence_history)

**Then run:** `src/data/learners-migration.sql` (learners table, episodes.learner_id)

**Then run:** `src/data/auth-migration.sql` (teachers table)

**Then run:** `src/data/native-language-migration.sql` (learners.native_language, if needed)

## 4. All-in-one migration (safe, idempotent)

**File:** `src/data/ensure-all.sql`

Run it in Neon SQL Editor to ensure all tables and columns exist. Safe to run multiple times.

## 5. Confirm DATABASE_URL

In Vercel: Project → Settings → Environment Variables → `DATABASE_URL`  
In local `.env`: `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`

The connection string is in Neon: Project → Connection Details → Connection string.
