-- Daily micro-practice completion (one row per learner per calendar day)

CREATE TABLE IF NOT EXISTS learner_micro_practice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  day date NOT NULL,
  word_key text NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (learner_id, day)
);

CREATE INDEX IF NOT EXISTS idx_learner_micro_learner ON learner_micro_practice(learner_id, day DESC);

COMMENT ON TABLE learner_micro_practice IS 'Oppipolku 5 min micro-practice — completed days';
