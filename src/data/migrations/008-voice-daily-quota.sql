-- Daily Knuut voice usage per learner (Europe/Helsinki calendar date). No rollover — unused seconds do not carry over.
CREATE TABLE IF NOT EXISTS learner_voice_daily_usage (
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  seconds_used integer NOT NULL DEFAULT 0 CHECK (seconds_used >= 0 AND seconds_used <= 86400),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (learner_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_learner_voice_daily_usage_date ON learner_voice_daily_usage(usage_date);
