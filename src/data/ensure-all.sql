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

-- 2b. Brain nodes: metadata (if table existed from older schema)
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
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

-- 6. Teacher override (human-in-the-loop, EU AI Act)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS teacher_reviewed_at timestamptz DEFAULT NULL;

-- 7. Learners: learning_goal (onboarding)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS learning_goal text DEFAULT NULL;

-- 8. Multi-tenancy (required for /api/teacher/learners when teacher has org_id)
CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text DEFAULT 'school',
  plan text DEFAULT 'trial',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE learners ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE brain_nodes ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organisations(id);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS admin boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_learners_org ON learners(org_id);
CREATE INDEX IF NOT EXISTS idx_episodes_org ON episodes(org_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON agents(org_id);
CREATE INDEX IF NOT EXISTS idx_brain_nodes_org ON brain_nodes(org_id);

-- 9. Streak freezes (required for /api/brain/stats and /api/brain/use-freeze)
ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_remaining int DEFAULT 2;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS streak_freezes_used jsonb DEFAULT '[]';

-- 10. CEFR history (optional, but used by parts of the learning pipeline)
CREATE TABLE IF NOT EXISTS cefr_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id),
  from_level text,
  to_level text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cefr_history_learner ON cefr_history(learner_id);


-- 11. Teacher notes + action decisions (human-in-the-loop teacher memory)
CREATE TABLE IF NOT EXISTS teacher_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  note text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_learner ON teacher_notes(learner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid REFERENCES learners(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  status text DEFAULT 'suggested',
  ai_title text,
  ai_reason text,
  ai_draft text,
  teacher_decision text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_actions_learner ON teacher_actions(learner_id, created_at DESC);
