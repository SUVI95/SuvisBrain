-- ALKUPOLKU LMS — teacher roles + module catalog (Kuopio tender backbone)
-- Idempotent; safe to re-run.

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_kind text
  CHECK (teacher_kind IS NULL OR teacher_kind IN ('vastuuopettaja', 'ohjaaja'));

COMMENT ON COLUMN teachers.teacher_kind IS 'Vastuuopettaja (A) vs Ohjaaja (B) — tender roles';

CREATE TABLE IF NOT EXISTS lms_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  level_label text,
  theme text NOT NULL,
  sort_order int DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

INSERT INTO lms_modules (code, level_label, theme, sort_order, content) VALUES
  ('M1', 'Pre-A1', 'Latin alphabet, basic sounds, numbers', 1, '{"title":"M1 — Pre-A1"}'),
  ('M2', 'A1.1', 'Greetings, daily life, family', 2, '{"title":"M2 — A1.1"}'),
  ('M3', 'A1.2', 'Work vocabulary, asking for help', 3, '{"title":"M3 — A1.2"}'),
  ('M4', 'A1.3', 'Healthcare, services, transport', 4, '{"title":"M4 — A1.3"}'),
  ('M5', 'A2.1', 'Workplace Finnish, instructions', 5, '{"title":"M5 — A2.1"}'),
  ('M6', 'A2.2', 'Job seeking, interviews, YKI prep', 6, '{"title":"M6 — A2.2"}'),
  ('YX', '+All', 'Finnish society & culture (yhteiskuntatietous)', 7, '{"title":"Yhteiskuntatietous"}'),
  ('EL', '+All', 'Life management (elämänhallinta)', 8, '{"title":"Elämänhallinta"}')
ON CONFLICT (code) DO NOTHING;
