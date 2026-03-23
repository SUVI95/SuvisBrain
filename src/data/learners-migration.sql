-- ============================================================
-- Learners table + episodes.learner_id — run in Neon SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS learners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  email        TEXT UNIQUE,
  mother_tongue TEXT,
  cefr_level   TEXT DEFAULT 'A1',
  agent_id     UUID REFERENCES agents(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE episodes
  ADD COLUMN IF NOT EXISTS learner_id UUID REFERENCES learners(id);

CREATE INDEX IF NOT EXISTS idx_episodes_learner ON episodes(learner_id);

INSERT INTO learners (name, email, mother_tongue, cefr_level) VALUES
  ('Amira Hassan',   'amira@test.fi',  'Arabic',   'A1'),
  ('Pavel Sorokin',  'pavel@test.fi',  'Russian',  'A2'),
  ('Fatuma Warsame', 'fatuma@test.fi', 'Somali',   'A1'),
  ('Li Wei',         'li@test.fi',     'Mandarin', 'B1')
ON CONFLICT (email) DO NOTHING;
