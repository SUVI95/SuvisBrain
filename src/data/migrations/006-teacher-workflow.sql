-- Teacher workflow: placements + HOPS draft storage (idempotent)

CREATE TABLE IF NOT EXISTS learner_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'employer_found',
      'briefing_done',
      'active',
      'completed',
      'feedback_given'
    )),
  employer_name text,
  employer_contact text,
  start_date date,
  end_date date,
  briefing_at timestamptz,
  feedback_at timestamptz,
  notes text,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (learner_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_placements_status ON learner_placements(status);
CREATE INDEX IF NOT EXISTS idx_learner_placements_start ON learner_placements(start_date);

COMMENT ON TABLE learner_placements IS 'Työssäoppiminen — tila, työnantaja, päivät (ALKUPOLKU)';

ALTER TABLE learners ADD COLUMN IF NOT EXISTS hops_draft text;
ALTER TABLE learners ADD COLUMN IF NOT EXISTS hops_draft_at timestamptz;

COMMENT ON COLUMN learners.hops_draft IS 'Viimeisin generoitu HOPS-luonnos (opettaja voi muokata)';
