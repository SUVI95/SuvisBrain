-- ============================================================
-- Ensure all required tables/columns exist in Neon
-- Run this in Neon SQL Editor if you're unsure what's been applied
-- Idempotent — safe to run multiple times
-- ============================================================
-- Prerequisite: agents, episodes, brain_nodes must exist.
-- For a fresh DB, run schema.sql first, then this file.

-- 1. Learners table (must exist before episodes.learner_id FK)
CREATE TABLE IF NOT EXISTS learners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  mother_tongue text,
  cefr_level text DEFAULT 'A1',
  agent_id uuid REFERENCES agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Episodes: metadata + learner_id (for learner-scoped sessions)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS learner_id uuid REFERENCES learners(id);
CREATE INDEX IF NOT EXISTS idx_episodes_learner ON episodes(learner_id);

-- 3. Brain nodes: confidence_history (for sparklines)
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS confidence_history jsonb DEFAULT '[]';

-- 4. Teachers (for auth)
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text,
  created_at timestamptz DEFAULT now()
);

-- 5. Learners: native_language (ISO 639-1)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS native_language varchar(10) DEFAULT NULL;
